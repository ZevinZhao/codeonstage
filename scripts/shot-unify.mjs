// ============================================================
// shot-unify.mjs - 全站统一视觉验收截图（Chrome CDP 直控）
// 用法：node scripts/shot-unify.mjs
// 依赖：vite preview 已在 4173 端口运行
// ============================================================
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223;
const BASE = 'http://localhost:4173';
const OUT = 'docs/screenshots';

mkdirSync(OUT, { recursive: true });

/** 页面清单：[文件名, 路径, 宽, 高, dsf, mobile, 等待ms, 是否WebGL抖动] */
const SHOTS = [
  ['unify-home-desktop.png', '/', 1440, 900, 2, false, 9000, true],
  ['unify-skills-desktop.png', '/skills', 1440, 1600, 2, false, 8000, false],
  ['unify-skill-detail-desktop.png', '/skills/jacobbubu-claude-opus-5-5-js-animation-research', 1440, 1600, 2, false, 9000, false],
  ['unify-favorites-desktop.png', '/favorites', 1440, 900, 2, false, 5000, false],
  ['unify-wishpool-desktop.png', '/wishpool', 1440, 1400, 2, false, 6000, false],
  ['unify-notfound-desktop.png', '/missing-page-404', 1440, 900, 2, false, 4000, false],
  ['unify-skills-mobile.png', '/skills', 390, 844, 3, true, 6000, false],
  ['unify-wishpool-mobile.png', '/wishpool', 390, 844, 3, true, 5000, false],
  ['unify-detail-mobile.png', '/skills/jacobbubu-claude-opus-5-5-js-animation-research', 390, 844, 3, true, 7000, false],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 启动 Chrome headless */
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-color-profile=srgb',
  '--user-data-dir=/tmp/chrome-shot-profile',
  'about:blank',
], { stdio: 'ignore' });

/** 等待 DevTools 就绪 */
async function waitDevtools() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('DevTools 未就绪');
}

/** 简单 CDP 客户端（原生 WebSocket） */
function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const listeners = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  return {
    ready,
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(fn) { listeners.push(fn); },
    close() { ws.close(); },
  };
}

/** 新建 tab 并返回其 ws 地址 */
async function newTab() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
  const tab = await res.json();
  return tab;
}

/** 单页截图 */
async function capture([file, path, width, height, dsf, mobile, waitMs, jitter]) {
  const tab = await newTab();
  const cdp = createCdp(tab.webSocketDebuggerUrl);
  await cdp.ready;

  const setViewport = (w, h) =>
    cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: dsf, mobile,
    });

  await setViewport(width, height);
  await cdp.send('Page.enable');
  const loaded = new Promise((resolve) => {
    cdp.on((msg) => { if (msg.method === 'Page.loadEventFired') resolve(); });
  });
  await cdp.send('Page.navigate', { url: BASE + path });
  await Promise.race([loaded, sleep(4000)]);
  await sleep(waitMs);

  // WebGL 页面：viewport ±1px 相邻两次抖动，强制重新合成（规避快照缓存）
  if (jitter) {
    await setViewport(width, height + 1);
    await sleep(300);
    await setViewport(width, height);
    await sleep(600);
  }

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${file}`, Buffer.from(shot.data, 'base64'));
  console.log(`✓ ${file}`);

  cdp.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`).catch(() => {});
}

try {
  await waitDevtools();
  for (const shot of SHOTS) {
    await capture(shot).catch((e) => console.error(`✗ ${shot[0]}: ${e.message}`));
  }
} finally {
  chrome.kill();
}
console.log('DONE');
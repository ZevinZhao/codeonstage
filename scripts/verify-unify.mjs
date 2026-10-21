// ============================================================
// verify-unify.mjs - 全站视觉统一性 DOM 断言（Chrome CDP）
// 验证：放映厅背景 / 衬线标题 / 齿孔线 / 无品牌渐变残留 /
//       主按钮灰白实底 / 无横向溢出
// 用法：node scripts/verify-unify.mjs（需 vite preview @4173 运行中）
// ============================================================
import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9224;
const BASE = 'http://localhost:4173';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--user-data-dir=/tmp/chrome-verify-profile',
  'about:blank',
], { stdio: 'ignore' });

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

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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
    close() { ws.close(); },
  };
}

/** 在页面上执行的断言（浏览器上下文） */
const PAGE_ASSERTS = `(() => {
  const results = {};

  // 1. 横向溢出
  const de = document.documentElement;
  results.noHorizontalOverflow = de.scrollWidth <= de.clientWidth + 1;

  // 2. 放映厅页面背景（Layout 根 / 首页根）
  const hallRoot = document.querySelector('.bg-hall-page, .bg-screening-hall');
  results.hallBackground = !!hallRoot;

  // 3. 衬线大标题（font-display）
  results.serifHeadline = !!document.querySelector('.font-display');

  // 4. 品牌渐变 / 品牌发光残留（应为 0）
  let brandResidue = 0;
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage || '';
    const shadow = cs.boxShadow || '';
    if (bg.includes('linear-gradient(135deg, rgb(99, 102, 241)') ||
        bg.includes('linear-gradient(135deg, rgb(139, 92, 246)') ||
        bg.includes('#6366f1') || bg.includes('#8b5cf6')) brandResidue++;
    if (shadow.includes('99, 102, 241') || shadow.includes('139, 92, 246')) brandResidue++;
  }
  results.brandResidueCount = brandResidue;

  // 5. 齿孔线 / 齿孔带存在
  results.filmDivider = document.querySelectorAll('.film-divider, .film-band').length;

  // 6. 主按钮（.bg-content 实底）：找灰白实底按钮
  let primarySolid = null;
  for (const btn of document.querySelectorAll('button')) {
    const bg = getComputedStyle(btn).backgroundColor;
    if (bg === 'rgb(250, 250, 250)') { primarySolid = true; break; }
  }
  results.primarySolidButton = primarySolid;

  // 7. Header 品牌字标（衬线）
  const headerWordmark = document.querySelector('header .font-display');
  results.headerWordmark = !!headerWordmark;

  // 8. 高饱和品牌紫文字残留（brand-200/300/400 文字色）
  let brandText = 0;
  for (const el of document.querySelectorAll('*')) {
    const c = getComputedStyle(el).color;
    if (c === 'rgb(165, 180, 252)' || c === 'rgb(129, 140, 248)' ||
        c === 'rgb(167, 139, 250)') brandText++;
  }
  results.brandTextCount = brandText;

  return results;
})()`;

/** 页面清单：[名称, 路径, 宽, 高] */
const PAGES = [
  ['skills', '/skills', 1440, 1200],
  ['skill-detail', '/skills/jacobbubu-claude-opus-5-5-js-animation-research', 1440, 1200],
  ['favorites', '/favorites', 1440, 900],
  ['wishpool', '/wishpool', 1440, 1200],
  ['notfound', '/missing-page-404', 1440, 900],
  ['home', '/', 1440, 900],
  ['skills-mobile', '/skills', 390, 844],
  ['wishpool-mobile', '/wishpool', 390, 844],
  ['detail-mobile', '/skills/jacobbubu-claude-opus-5-5-js-animation-research', 390, 844],
];

async function verify([name, path, width, height]) {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
  const tab = await res.json();
  const cdp = createCdp(tab.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 500,
  });
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: BASE + path });
  await sleep(5000);

  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression: PAGE_ASSERTS,
    returnByValue: true,
  });
  if (exceptionDetails) {
    console.log(`✗ ${name}: 脚本异常 ${exceptionDetails.text}`);
  } else {
    const r = result.value;
    const checks = [
      ['无横向溢出', r.noHorizontalOverflow],
      ['放映厅背景', r.hallBackground],
      ['衬线标题存在', r.serifHeadline],
      ['品牌渐变残留=0', r.brandResidueCount === 0],
      ['品牌紫文字=0', r.brandTextCount === 0],
    ];
    if (name !== 'home') checks.push(['齿孔点缀存在', r.filmDivider > 0]);
    if (name === 'wishpool' || name === 'skill-detail' || name === 'favorites')
      checks.push(['灰白实底主按钮', r.primarySolidButton === true]);
    if (name !== 'home') checks.push(['Header 衬线字标', r.headerWordmark]);
    const failed = checks.filter(([, ok]) => !ok);
    const status = failed.length === 0 ? '✓' : '✗';
    console.log(`${status} ${name}: ${checks.length - failed.length}/${checks.length} 通过` +
      (failed.length ? ` | 失败: ${failed.map(([n]) => n).join(', ')} | 原始: ${JSON.stringify(r)}` : ''));
  }
  cdp.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`).catch(() => {});
}

try {
  await waitDevtools();
  for (const page of PAGES) {
    await verify(page).catch((e) => console.error(`✗ ${page[0]}: ${e.message}`));
  }
} finally {
  chrome.kill();
}
console.log('VERIFY DONE');
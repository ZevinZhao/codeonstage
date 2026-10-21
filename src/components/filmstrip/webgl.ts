// ============================================================
// WebGL 可用性检测
// - 供 FilmStripReel 在初始化前判断是否可走 Three.js 渲染
// - WebGL 不可用时由上层渲染降级 UI（后续任务完善）
// ============================================================

let cachedResult: boolean | null = null;

/**
 * 检测当前环境 WebGL 是否可用（优先 WebGL2）。
 * 结果做模块级缓存，避免多次创建/销毁测试上下文。
 */
export function isWebGLAvailable(): boolean {
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    cachedResult = gl !== null && gl !== undefined;
    // 立即释放测试上下文（扩展丢失常量在 TS 类型上不存在，安全访问）
    const loseCtx = (gl as WebGLRenderingContext | null)?.getExtension(
      'WEBGL_lose_context'
    );
    loseCtx?.loseContext();
  } catch {
    cachedResult = false;
  }
  return cachedResult;
}
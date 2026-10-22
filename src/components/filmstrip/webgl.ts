
let cachedResult: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    cachedResult = gl !== null && gl !== undefined;
    const loseCtx = (gl as WebGLRenderingContext | null)?.getExtension(
      'WEBGL_lose_context'
    );
    loseCtx?.loseContext();
  } catch {
    cachedResult = false;
  }
  return cachedResult;
}

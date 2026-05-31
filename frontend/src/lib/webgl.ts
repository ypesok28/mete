// Cheap one-shot WebGL probe so DecisionZone can fall back to the 2D stages on machines
// without a usable GL context (old laptops, headless, locked-down kiosks). Result is cached.
let cached: boolean | null = null;

export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false; // SSR pass — decided client-side later
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cached = Boolean(gl);
  } catch {
    cached = false;
  }
  return cached;
}

import type { NextConfig } from "next";

// Static export per 05_architecture §S2/S4: no SSR, no server runtime, no API routes.
// The export is plain static files served offline (by FastAPI on the demo port).
const nextConfig: NextConfig = {
  output: "export",
  // Emit directory-index files (out/console/index.html, not out/console.html) so the offline
  // demo's Starlette StaticFiles(html=True) mount resolves /console → /console/ cleanly. Without
  // this, a bare /console 404s (there'd be no index.html in the console/ dir). / stays index.html.
  trailingSlash: true,
  // next/image has no optimizer server under static export — required for offline.
  images: { unoptimized: true },
  // Dev-only proxy for the relative /solve seam (05 §S4): browser stays on one origin,
  // so the SAME fetch('/solve') works in dev and in the single-port demo collapse.
  // `rewrites` is ignored under `output: 'export'`; it only affects `next dev`.
  async rewrites() {
    return [
      {
        source: "/solve",
        destination: "http://localhost:8000/solve",
      },
    ];
  },
};

export default nextConfig;

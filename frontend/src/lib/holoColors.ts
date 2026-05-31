// Emissive hexes for the dark holographic viewport (BUILD-mode battlespace only). Warm, NO BLUE
// (established palette rule). Greens/reds are signal colors derived from the light theme's
// `covered`/`alert` accents, brightened for emissive use against the near-black viewport background.
export const HOLO = {
  viewportBg: "#070604",   // the dark recessed stage ground
  structure: "#E8A13A",    // amber — forge, grid lines, range rings (the "gate"/bronze family)
  structureDim: "#7C4F0E", // deep bronze — at-rest lines
  covered: "#6BD08A",      // green — covered target + its assigned trail
  uncovered: "#FF6B62",    // red — uncovered target + CANNOT-BUILD fault forge
} as const;

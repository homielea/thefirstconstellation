/** Mirrors the colour values in tokens.css so contrast can be tested (ACC-003). */
export const colors = {
  void: "#050609",
  eclipse: "#0C0E14",
  eclipseRaised: "#141821",
  line: "#2A3040",
  lineStrong: "#6B7386",
  slateLight: "#A9AFBD",
  starlight: "#F2F1EB",
  auroraBlue: "#8AA7FF",
  veilViolet: "#A98DDA",
  solarAmber: "#DAB77A",
  signalCoral: "#E6877F",
  successMist: "#8FC5B0",
} as const;

export const textOnSurfacePairs: Array<[keyof typeof colors, keyof typeof colors, number]> = [];
for (const fg of ["starlight", "slateLight", "auroraBlue", "solarAmber", "signalCoral", "successMist"] as const) {
  for (const bg of ["void", "eclipse", "eclipseRaised"] as const) textOnSurfacePairs.push([fg, bg, 4.5]);
}
textOnSurfacePairs.push(["lineStrong", "eclipse", 3], ["lineStrong", "void", 3]);

/**
 * Minimal design tokens. Dark theme by default — matches the idea that SafeSMS
 * is a protective layer that should feel calm and serious, not loud.
 */
export const theme = {
  colors: {
    bg: "#0b1220",
    surface: "#141c2e",
    surfaceElevated: "#1c2540",
    border: "#2a3350",
    text: "#eef2ff",
    textMuted: "#8a95b8",
    primary: "#4f8cff",
    primaryText: "#ffffff",
    success: "#4ade80",
    warning: "#facc15",
    danger: "#f87171",
  },
  space: (n: number) => n * 4,
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  text: {
    title: { fontSize: 22, fontWeight: "700" as const },
    heading: { fontSize: 18, fontWeight: "600" as const },
    body: { fontSize: 15, fontWeight: "400" as const },
    caption: { fontSize: 12, fontWeight: "400" as const },
    button: { fontSize: 16, fontWeight: "600" as const },
  },
};

export type Theme = typeof theme;

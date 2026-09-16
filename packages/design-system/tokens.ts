/**
 * Naze Design Tokens — palet WAJIB hanya blue/purple/pink/white/black (lihat spec §40).
 * Jangan tambahkan warna lain tanpa update dokumen ini + review desain.
 */
export const nazeColors = {
  black: "#0a0a0f",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  white: "#f5f5f7"
} as const;

export const nazeFonts = {
  ui: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace'
} as const;

export type NazeColor = keyof typeof nazeColors;

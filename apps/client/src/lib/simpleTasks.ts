/**
 * Deteksi pola "simple task" (Phase 19 — Simple Task Optimization) —
 * dipisah jadi fungsi murni supaya bisa di-test tanpa mocking fetch/network.
 * Kalau match, request dieksekusi LANGSUNG tanpa panggil AI sama sekali.
 */

export type SimpleTaskKind = "delete_file" | "create_folder" | "rename";

export interface SimpleTaskMatch {
  kind: SimpleTaskKind;
  groups: string[];
}

const PATTERNS: { kind: SimpleTaskKind; regex: RegExp }[] = [
  { kind: "delete_file", regex: /^hapus file (.+)$/i },
  { kind: "create_folder", regex: /^buat folder (.+)$/i },
  { kind: "rename", regex: /^rename (.+?) (?:jadi|menjadi|ke) (.+)$/i }
];

export function matchSimpleTask(request: string): SimpleTaskMatch | null {
  const trimmed = request.trim();
  for (const p of PATTERNS) {
    const m = trimmed.match(p.regex);
    if (m) return { kind: p.kind, groups: m.slice(1).map((g) => g.trim()) };
  }
  return null;
}

/**
 * SECURITY — Phase 20. Validasi path & ukuran konten dipakai di SEMUA
 * endpoint yang menerima path dari client (file explorer, editor, AI
 * implementer, rollback) sebelum menyentuh GitHub API sama sekali.
 * Menegakkan spec §51: tidak ada "../", tidak ada absolute path, tidak
 * ada AI/user yang bisa "keluar" dari workspace project.
 */

const MAX_CONTENT_BYTES = 5 * 1024 * 1024; // 5MB — file size limit (spec §51)
const MAX_PATH_LENGTH = 1000;

export function assertSafePath(path: unknown): string {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Path tidak valid.");
  }
  if (path.length > MAX_PATH_LENGTH) {
    throw new Error("Path terlalu panjang.");
  }
  if (path.includes("\0")) {
    throw new Error("Path mengandung karakter tidak valid.");
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(path)) {
    throw new Error("Path mengandung karakter kontrol yang tidak diizinkan.");
  }
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(path)) {
    throw new Error("Absolute path tidak diizinkan — semua path harus relatif terhadap root project.");
  }
  const segments = path.split("/");
  if (segments.some((s) => s === "..")) {
    throw new Error("Path traversal ('..') tidak diizinkan.");
  }
  if (segments.some((s) => s.trim() === "")) {
    throw new Error("Path tidak boleh mengandung segmen kosong (mis. '//').");
  }
  if (segments[0] === ".git") {
    throw new Error("Tidak boleh mengubah folder internal .git.");
  }
  return path;
}

export function assertSafeContentSize(content: string): void {
  const bytes = Buffer.byteLength(content, "utf-8");
  if (bytes > MAX_CONTENT_BYTES) {
    throw new Error(`Ukuran file (${(bytes / 1024 / 1024).toFixed(2)}MB) melebihi batas ${MAX_CONTENT_BYTES / 1024 / 1024}MB.`);
  }
}

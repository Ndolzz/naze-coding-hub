# NAZE CODING HUB — Security Posture (Phase 20)

Ringkasan apa yang sudah ditegakkan, dan kenapa beberapa item di spec asli
(§51) diterjemahkan berbeda karena arsitektur full-Vercel + GitHub-as-storage.

## Ditegakkan sekarang

| Kontrol | Implementasi |
|---|---|
| Path traversal protection | `github/pathSafety.ts` — `assertSafePath()` menolak `..`, absolute path, null byte, karakter kontrol, segmen kosong. Dipanggil di **semua** endpoint yang menerima path dari client: `api/files/*`, `api/ai/implement.ts` (tiap item plan AI), `api/ai/rollback.ts`. |
| Workspace isolation | Satu Naze Project = satu repo GitHub (Phase 8) — isolasi terjadi di level repo, AI/user tidak pernah bisa menyentuh repo lain lewat path manipulation. |
| File size limit | `assertSafeContentSize()` — cap 5MB per file, dipanggil di `api/files/save.ts` dan `api/ai/implement.ts`. |
| Resource limit (AI) | `implement.ts` menolak plan dengan >20 item sekaligus — mencegah satu request AI memicu ratusan commit. |
| Output limit | Log build dipotong ke 20.000 karakter (`github/actions.ts`); context yang dikirim ke Claude/Gemini dipotong per file (4-6KB) supaya prompt tidak membengkak tak terkendali. |
| Secure secret handling | API key hanya di Vercel Environment Variables, tidak pernah dikirim ke client (`api/system/status.ts` cuma balas boolean); input key di UI pakai `type="password"`. |
| Destructive action confirmation | `NazeConfirmModal` (custom, bukan `confirm()` browser) — dipakai di delete project, delete file/folder, delete lewat AI plan. |
| AI action approval | Naze Plan tidak pernah auto-commit — wajib lewat `Preview Changes` → `Confirm & Commit` (Phase 16-18). |
| Filename sanitization | Bagian dari `assertSafePath()` — segmen kosong, karakter kontrol, panjang berlebih ditolak. |

## Diterjemahkan ulang (karena arsitektur)

- **Command restrictions / process timeout / sandbox eksekusi**: spec asli mengasumsikan ada shell/container yang menjalankan command. Karena keputusan "Full Vercel, tanpa terminal interaktif" (Phase 1), tidak ada command execution di sisi Naze sama sekali — build/test/lint sepenuhnya didelegasikan ke **GitHub Actions**, yang punya sandbox-nya sendiri di luar kendali (atau tanggung jawab) Naze.
- **Permission checks antar-user**: karena keputusan single-user tanpa login (Phase 1), tidak ada model permission antar-akun. Yang ada adalah permission per-aksi (approval sebelum AI commit, confirm sebelum delete) — bukan role-based access control.

## Belum dikerjakan (bukan lupa — belum masuk giliran)

- Rate limiting per endpoint (mencegah spam request ke Claude/Gemini) — kandidat kuat untuk Settings (Phase 48) atau audit akhir (Phase 26).

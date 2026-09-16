# NAZE CODING HUB — CI/CD (Phase 25)

## Pipeline (`.github/workflows/build.yml`)

Dipetakan langsung ke urutan yang diminta spec §32:

1. Checkout
2. Setup Node (runtime)
3. Install dependencies
4. **Validate project structure** — cek file/folder inti ada (`apps/client/package.json`, `index.html`, `vercel.json`, `api/`)
5. Lint
6. Test (`vitest` — api/ pure logic + komponen client, lihat Phase 24)
7. Security scan — tolak referensi Mistral & pola hardcoded secret (§35)
8. Dependency vulnerability scan (`npm audit`, informational — tidak menggagalkan build)
9. Build
10. **Validate build output** — cek `dist/` ada, `dist/index.html` ada, tidak kosong
11. Package & upload artifact (`naze-coding-hub-build`)

Hanya `build.yml` yang dibuat — tidak ada `test.yml`/`release.yml` terpisah karena belum dibutuhkan (spec §31: "jangan membuat workflow yang tidak diperlukan"). Test sudah cukup terintegrasi sebagai satu step di `build.yml`.

## Kenapa tidak ada `deploy.yml`

Spec §36 minta deployment workflow "jika project menggunakan hosting". NAZE CODING HUB pakai Vercel (Phase 1), dan Vercel punya **native Git integration**: begitu repo di-connect ke Vercel Project (lewat dashboard Vercel, bukan lewat Naze), setiap push ke `main` otomatis ter-deploy — tanpa perlu GitHub Actions sama sekali.

Sengaja **tidak** dibuat `deploy.yml` custom yang manggil Vercel CLI, karena itu akan **deploy dua kali** (sekali dari Vercel's native integration, sekali dari Actions) untuk push yang sama — bukan penghematan, malah duplikasi kerja dan bisa bikin status deployment membingungkan (dua run saling tumpang tindih). Kalau nanti Vercel native integration sengaja dimatikan dan mau full deploy lewat Actions, baru relevan bikin `deploy.yml` pakai `VERCEL_TOKEN` (sudah ada di Environment Variables dari Phase 13).

Untuk **project individual** yang dibuat user lewat Naze (bukan Naze-nya sendiri), masing-masing project boleh punya `deploy.yml` sendiri sesuai kebutuhan hosting-nya — di luar cakupan `build.yml` milik Naze Coding Hub ini.

## Clean build (§33)

Terjamin dari desain: CI selalu mulai dari `actions/checkout` bersih + `npm install` bersih, tidak ada langkah yang bergantung pada file lokal developer. `.gitignore` (Phase 2) sudah exclude `node_modules/`, `dist/`, `.vercel/`, `.env*`.

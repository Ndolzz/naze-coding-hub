# NAZE CODING HUB

Coding workspace berbasis web (mobile-first) dengan Naze AI (Claude = Architect/Analyzer,
Gemini = Implementer). Build utama melalui GitHub Actions. Hosting full Vercel.

## Struktur
- `apps/client` — Frontend PWA (React + Vite + TypeScript)
- `api/` — Vercel Serverless Functions (backend: proxy AI, wrapper GitHub API)
- `packages/design-system` — Token warna & typography Naze
- `packages/shared-types` — Tipe TypeScript yang dipakai bersama client & api
- `.naze/config.example.json` — contoh skema metadata project (disimpan di repo, bukan DB)

## Setup lokal
```
npm install
npm run dev -w apps/client
```

## Environment Variables (diisi di Vercel, JANGAN commit .env)
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `GITHUB_TOKEN` (untuk backend membaca/menulis file project via GitHub Contents API)

## Status
Phase 1 (Architecture) dan Phase 2 (Project Scaffold) — lihat `docs/ARCHITECTURE.md`.
Fitur AI, editor, dan Build & Logs viewer BELUM diimplementasikan penuh di scaffold ini —
menyusul di phase-phase berikutnya sesuai roadmap.

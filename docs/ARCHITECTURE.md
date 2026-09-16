# NAZE CODING HUB — PHASE 1: ARCHITECTURE (v2 — Full Vercel)

## 1. Ringkasan Sistem

NAZE CODING HUB adalah web-based coding workspace (mobile-first, PWA) yang seluruhnya berjalan di **Vercel** — tanpa server/container terpisah, dan tanpa terminal shell asli.

```
CLIENT (PWA, Vercel)
     │
     ▼
BACKEND (Vercel Serverless Functions)
     │
     ├──▶ CLAUDE  (Architect/Analyzer)
     ├──▶ GEMINI  (Implementer)
     └──▶ GITHUB API  (source of truth: file, commit, branch, Actions run)
```

Perubahan kunci dari draft sebelumnya (karena kamu memilih "full Vercel, gak butuh terminal asli"):
- Tidak ada Workspace Runtime/container per project lagi — command seperti npm/lint/test/build **hanya** dijalankan lewat GitHub Actions, bukan dieksekusi live dari UI.
- Tidak ada storage disk sendiri — **repo GitHub project itu sendiri yang jadi filesystem-nya**. Create/edit/delete file di editor = commit ke repo lewat GitHub API.
- Panel "Terminal" di UI berubah fungsi jadi **Build & Logs Viewer**: menampilkan run GitHub Actions yang sesungguhnya (status, log, exit code) — bukan shell interaktif, tapi tetap "nyata" (bukan fake, sesuai aturan No Fake Features di spec asli).

---

## 2. Tech Stack

### Frontend (Client)
- React + Vite + TypeScript, PWA (manifest + service worker)
- Editor: Monaco Editor (multi-tab, syntax highlight, code folding)
- State: React `useState` biasa (di-lift ke `App.tsx` buat state lintas-panel) — ternyata cukup sampai Phase 25, Zustand yang direncanakan di draft awal ini dihapus karena gak pernah kepake (lihat Final Audit, Phase 26)
- Styling: CSS custom, token warna Naze (hitam/biru/ungu/pink), tanpa Bootstrap/Material
- Host: **Vercel**

### Backend (API Gateway + Orchestrator)
- Vercel Serverless Functions (Node.js/TypeScript) — pola sama seperti project Box Coding AI kamu
- Tanggung jawab:
  - Proxy request ke Claude API & Gemini API (API key disimpan di Vercel Environment Variables, tidak pernah dikirim ke client)
  - Orkestrasi: Context Builder → Claude Analysis → Plan → Gemini Implementation → Validation
  - Semua operasi file (create/read/update/delete) → diteruskan ke **GitHub Contents API** (commit langsung ke branch project)
  - Trigger & baca status **GitHub Actions** (via GitHub API) untuk build dan test
- Batasan yang harus diterima: function Vercel punya timeout (detik–menit tergantung plan), jadi tidak cocok untuk proses panjang — semua proses panjang (install, build, test) didelegasikan ke GitHub Actions, backend cuma memantau statusnya.

### Storage (tanpa Workspace Runtime & tanpa DB terpisah)
- **File project**: disimpan di repo GitHub itu sendiri (1 repo = 1 project, atau 1 repo dengan folder per project — lihat Phase 2 untuk keputusan ini)
- **Metadata ringan (daftar project, setting AI, preferensi editor, Naze Memory)**: disimpan sebagai file JSON di dalam repo (mis. `.naze/config.json`, `.naze/memory.json`) — jadi ikut ter-version dan ter-backup otomatis lewat Git, tanpa perlu database terpisah
- **Secrets (API key Claude & Gemini)**: Vercel Environment Variables, terenkripsi oleh Vercel, tidak pernah masuk ke repo

### AI Providers
- Claude → Architect/Analyzer
- Gemini → Implementer
- Tidak ada provider ketiga, semua referensi Mistral lama wajib dihapus (dicek di CI)

---

## 3. Struktur Folder Repository

```
naze-coding-hub/
├── apps/
│   └── client/                # React PWA
├── api/                        # Vercel Serverless Functions (backend)
│   ├── ai/                     # proxy Claude & Gemini + orchestrator
│   ├── github/                 # wrapper GitHub Contents API & Actions API
│   └── projects/               # baca/tulis .naze/config.json via GitHub API
├── packages/
│   ├── design-system/
│   └── shared-types/
├── .github/
│   └── workflows/
│       ├── build.yml
│       └── test.yml
├── docs/
│   └── ARCHITECTURE.md
└── vercel.json
```

Catatan: struktur di atas untuk repo NAZE CODING HUB (aplikasinya sendiri). Repo project milik user (yang dibuat lewat "CREATE PROJECT") terpisah, masing-masing punya `.naze/config.json` + `.github/workflows/build.yml` sendiri.

---

## 4. Alur Data Utama

**A. Alur Chat AI**
```
User request
   → Context Builder (fetch file relevan via GitHub API)
   → Claude: analisis + rencana perubahan
   → Naze Plan (list CREATE/MODIFY/DELETE)
   → PROPOSED CHANGES → user APPROVE/CANCEL
   → Gemini: implementasi
   → Commit ke GitHub (via Contents API) di branch kerja
   → Diff ditampilkan dari GitHub compare API → user terima/rollback (revert commit)
```

**B. Alur Build**
```
Commit masuk ke GitHub (dari aksi AI atau langsung)
   → GitHub Actions terpicu
   → install → lint → test → security scan (Mistral & hardcoded secret check) → build
   → artifact "naze-coding-hub-build" / project build
   → Backend polling status via GitHub API → tampil di Build & Logs panel
```

**C. Alur "Terminal" (Build & Logs, bukan shell)**
```
User buka panel Terminal
   → Backend ambil run terakhir dari GitHub Actions API
   → Tampilkan step-by-step log asli + exit status
   → Kalau gagal → tombol "ASK NAZE AI" → kirim log ke Claude untuk analisis error
```

---

## 5. Keputusan Keamanan Kunci
1. API key Claude & Gemini hanya ada di Vercel Environment Variables, tidak pernah dikirim ke client.
2. Semua tulis-file lewat GitHub API tunduk pada permission layer: perubahan besar wajib approval user (PROPOSED CHANGES), simple task (rename/format) boleh langsung.
3. CI wajib fail jika ditemukan: referensi Mistral, hardcoded secret, path traversal pattern.
4. Karena tidak ada shell asli, risiko command-injection dari fitur "terminal" otomatis hilang — permukaan serangan jauh lebih kecil dibanding desain container sebelumnya.

---

## 6. Keputusan Final Phase 1

| Keputusan | Pilihan |
|---|---|
| Hosting | **Full Vercel** (frontend + backend serverless), tanpa container/runtime terpisah |
| Eksekusi command (npm/lint/test/build) | **GitHub Actions saja** — tidak ada terminal interaktif |
| Storage file & metadata | **Repo GitHub** (Contents API), tanpa database terpisah |
| Sistem user | Single-user, tanpa login |

### Implikasi terhadap spec asli yang perlu kamu sadari
- Spec asli (bagian 13–14) membayangkan terminal yang bisa jalanin `npm`, `python`, `git` secara langsung. Dengan pilihan "gak butuh terminal asli", panel itu diganti jadi **Build & Logs Viewer** (real, bukan fake — datanya dari GitHub Actions run sungguhan). Kalau nanti kamu berubah pikiran dan butuh command interaktif beneran, itu perlu tambahan runtime terpisah (container/Codespace) — bukan sesuatu yang bisa dilakukan Vercel serverless.
- SQLite yang sempat diputuskan sebelumnya di-drop karena Vercel serverless tidak punya disk persisten. Diganti jadi file JSON di repo (`.naze/config.json`, `.naze/memory.json`) — cukup untuk single-user, dan otomatis ter-version lewat Git.

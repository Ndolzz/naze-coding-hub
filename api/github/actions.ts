/**
 * Wrapper GitHub Actions API — dipakai sebagai "Terminal" (Phase 11), yang
 * di arsitektur full-Vercel kita berubah jadi Build & Logs Viewer (lihat
 * ARCHITECTURE.md §6). Setiap commit dari File Explorer/Editor (Phase 9-10)
 * otomatis men-trigger `on: push` di build.yml — jadi panel ini benar-benar
 * menampilkan build yang terpicu dari aktivitas user, bukan simulasi.
 */
import { authHeaders } from "./contents";

const GITHUB_API = "https://api.github.com";
const MAX_LOG_CHARS = 20000; // output limit (spec §13/§51) — jangan kirim log raksasa ke client

export async function listWorkflowRuns(repoFullName: string, perPage = 10) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/actions/runs?per_page=${perPage}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Gagal ambil daftar run: ${res.status}`);
  const data = await res.json();
  return data.workflow_runs as Array<{
    id: number;
    status: string;
    conclusion: string | null;
    html_url: string;
    display_title: string;
    created_at: string;
    head_commit?: { message: string };
  }>;
}

export async function listRunJobs(repoFullName: string, runId: number) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/actions/runs/${runId}/jobs`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Gagal ambil jobs: ${res.status}`);
  const data = await res.json();
  return data.jobs as Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    steps: Array<{ name: string; status: string; conclusion: string | null; number: number }>;
  }>;
}

export async function getJobLogs(repoFullName: string, jobId: number): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/actions/jobs/${jobId}/logs`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Gagal ambil log: ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_LOG_CHARS) {
    return `...(dipotong, menampilkan ${MAX_LOG_CHARS} karakter terakhir)...\n` + text.slice(-MAX_LOG_CHARS);
  }
  return text;
}

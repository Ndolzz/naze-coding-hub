/**
 * Wrapper Git-level GitHub API — Phase 12. Karena tidak ada working
 * directory lokal (semua commit langsung ke remote lewat Contents API),
 * "status" di sini berarti commit history + file yang berubah per commit,
 * bukan staged/unstaged seperti git CLI biasa.
 */
import { authHeaders } from "./contents";

const GITHUB_API = "https://api.github.com";

export async function listCommits(repoFullName: string, branch: string, perPage = 15) {
  const res = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`Gagal ambil commit history: ${res.status}`);
  const data = await res.json();
  return (data as any[]).map((c) => ({
    sha: c.sha as string,
    message: c.commit.message as string,
    author: c.commit.author?.name as string,
    date: c.commit.author?.date as string
  }));
}

export async function getCommitDetail(repoFullName: string, sha: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/commits/${sha}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Gagal ambil detail commit: ${res.status}`);
  const data = await res.json();
  return {
    sha: data.sha as string,
    message: data.commit.message as string,
    files: (data.files ?? []).map((f: any) => ({
      filename: f.filename as string,
      status: f.status as string, // added | modified | removed | renamed
      additions: f.additions as number,
      deletions: f.deletions as number,
      patch: (f.patch as string) ?? null
    }))
  };
}

export async function listBranches(repoFullName: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/branches?per_page=50`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Gagal ambil daftar branch: ${res.status}`);
  const data = await res.json();
  return (data as any[]).map((b) => ({ name: b.name as string, protected: Boolean(b.protected) }));
}

export async function createBranch(repoFullName: string, newBranch: string, fromBranch: string) {
  const refRes = await fetch(`${GITHUB_API}/repos/${repoFullName}/git/ref/heads/${fromBranch}`, {
    headers: authHeaders()
  });
  if (!refRes.ok) throw new Error(`Gagal baca ref branch sumber: ${refRes.status}`);
  const refData = await refRes.json();

  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/git/refs`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: refData.object.sha })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gagal membuat branch: ${res.status} ${detail}`);
  }
  return res.json();
}

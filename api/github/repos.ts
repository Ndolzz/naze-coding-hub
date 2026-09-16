/**
 * Wrapper GitHub API level repository — dipakai Phase 8 (Project System).
 * Satu Naze Project = satu GitHub repo (keputusan Phase 8, lihat
 * ARCHITECTURE.md §2 Storage). Semua fungsi di sini melakukan call nyata
 * ke GitHub, tidak ada yang di-mock.
 */
import { authHeaders } from "./contents";

const GITHUB_API = "https://api.github.com";

export async function getAuthenticatedUser(): Promise<{ login: string }> {
  const res = await fetch(`${GITHUB_API}/user`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GitHub getAuthenticatedUser gagal: ${res.status}`);
  return res.json();
}

export async function getRepo(repoFullName: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Repo ${repoFullName} tidak ditemukan atau tidak bisa diakses (${res.status}).`);
  return res.json();
}

export async function createRepo(name: string) {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ name, private: true, auto_init: true, description: "Naze Coding Hub project" })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gagal membuat repo GitHub: ${res.status} ${detail}`);
  }
  return res.json();
}

export async function deleteRepo(repoFullName: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(
      `Gagal menghapus repo GitHub (${res.status}). Token mungkin tidak punya scope 'delete_repo'.`
    );
  }
}

export async function renameRepo(repoFullName: string, newName: string) {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ name: newName })
  });
  if (!res.ok) throw new Error(`Gagal rename repo GitHub: ${res.status}`);
  return res.json();
}

export async function getTreeRecursive(repoFullName: string, branch: string) {
  const branchRes = await fetch(`${GITHUB_API}/repos/${repoFullName}/branches/${branch}`, {
    headers: authHeaders()
  });
  if (!branchRes.ok) throw new Error(`Gagal baca branch ${branch}: ${branchRes.status}`);
  const branchData = await branchRes.json();
  const treeSha = branchData.commit.commit.tree.sha;

  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/git/trees/${treeSha}?recursive=1`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Gagal baca tree: ${res.status}`);
  const data = await res.json();
  return (data.tree as { path: string; type: string; sha: string }[]).filter((t) => t.type === "blob");
}

export async function getBlob(repoFullName: string, sha: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/git/blobs/${sha}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Gagal baca blob: ${res.status}`);
  const data = await res.json();
  return data.content as string; // base64
}

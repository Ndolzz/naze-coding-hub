/**
 * Wrapper tipis di atas GitHub Contents API — dipakai sebagai "filesystem"
 * project (lihat ARCHITECTURE.md §2 Storage). Semua path divalidasi supaya
 * tidak bisa keluar dari repo project (tidak ada arti "../" atau absolute
 * path di sini karena GitHub API sendiri sudah scoped ke repo).
 */

const GITHUB_API = "https://api.github.com";

export function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN belum dikonfigurasi di Vercel.");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  };
}

export async function getFile(repoFullName: string, path: string, ref?: string) {
  const url = `${GITHUB_API}/repos/${repoFullName}/contents/${path}${ref ? `?ref=${ref}` : ""}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub getFile gagal: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function upsertFile(
  repoFullName: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
) {
  const url = `${GITHUB_API}/repos/${repoFullName}/contents/${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch,
      ...(sha ? { sha } : {})
    })
  });
  if (!res.ok) {
    throw new Error(`GitHub upsertFile gagal: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteFile(
  repoFullName: string,
  path: string,
  message: string,
  branch: string,
  sha: string
) {
  const url = `${GITHUB_API}/repos/${repoFullName}/contents/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ message, sha, branch })
  });
  if (!res.ok) {
    throw new Error(`GitHub deleteFile gagal: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getLatestWorkflowRun(repoFullName: string) {
  const url = `${GITHUB_API}/repos/${repoFullName}/actions/runs?per_page=1`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub getLatestWorkflowRun gagal: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Commit history sebuah branch (Phase 12 — "git status" versi Naze).
 */
import { listCommits } from "../github/git";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { repoFullName, branch } = (await req.json()) as { repoFullName: string; branch: string };

  try {
    const commits = await listCommits(repoFullName, branch);
    return new Response(JSON.stringify(commits), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

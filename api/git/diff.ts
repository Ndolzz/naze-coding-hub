/**
 * Diff per file untuk satu commit (Phase 12).
 */
import { getCommitDetail } from "../github/git";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { repoFullName, sha } = (await req.json()) as { repoFullName: string; sha: string };

  try {
    const detail = await getCommitDetail(repoFullName, sha);
    return new Response(JSON.stringify(detail), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

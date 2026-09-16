/**
 * GET file tree lengkap sebuah project (Phase 9). Client membangun
 * struktur nested folder/file sendiri dari list flat ini.
 */
import { listTree } from "../github/files";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, branch } = (await req.json()) as { repoFullName: string; branch: string };

  try {
    const tree = await listTree(repoFullName, branch);
    return new Response(JSON.stringify(tree), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

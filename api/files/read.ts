/**
 * Baca isi satu file (Phase 10 — Code Editor). Mengembalikan content +
 * sha (dipakai untuk concurrency check saat save).
 */
import { getFile } from "../github/contents";
import { assertSafePath, assertSafeContentSize } from "../github/pathSafety";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, branch, path } = (await req.json()) as {
    repoFullName: string;
    branch: string;
    path: string;
  };

  try {
    assertSafePath(path);

    const file = await getFile(repoFullName, path, branch);
    const content = Buffer.from(file.content, "base64").toString("utf-8");
    return new Response(JSON.stringify({ content, sha: file.sha }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

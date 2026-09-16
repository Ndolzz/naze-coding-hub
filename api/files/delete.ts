/**
 * DELETE file/folder (Phase 9). Destructive — frontend wajib konfirmasi
 * lewat NazeConfirmModal (spec §22).
 */
import { deletePath } from "../github/files";
import { assertSafePath, assertSafeContentSize } from "../github/pathSafety";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, branch, path, type } = (await req.json()) as {
    repoFullName: string;
    branch: string;
    path: string;
    type: "file" | "folder";
  };

  try {
    assertSafePath(path);

    await deletePath(repoFullName, branch, path, type);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

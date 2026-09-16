/**
 * COPY / DUPLICATE file/folder (Phase 9).
 */
import { copyPath } from "../github/files";
import { assertSafePath, assertSafeContentSize } from "../github/pathSafety";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, branch, oldPath, newPath, type } = (await req.json()) as {
    repoFullName: string;
    branch: string;
    oldPath: string;
    newPath: string;
    type: "file" | "folder";
  };

  try {
    assertSafePath(oldPath);
    assertSafePath(newPath);

    await copyPath(repoFullName, branch, oldPath, newPath, type);
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

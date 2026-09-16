/**
 * Save isi file dari Code Editor (Phase 10). Mengirim `sha` lama sebagai
 * optimistic concurrency check — kalau file berubah di GitHub sejak
 * dibuka (mis. commit lain), GitHub API akan menolak dengan 409/422
 * dan editor wajib minta user reload dulu (bukan menimpa diam-diam).
 */
import { upsertFile } from "../github/contents";
import { assertSafePath, assertSafeContentSize } from "../github/pathSafety";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, branch, path, content, sha } = (await req.json()) as {
    repoFullName: string;
    branch: string;
    path: string;
    content: string;
    sha: string;
  };

  try {
    assertSafePath(path);
    assertSafeContentSize(content);

    const result = await upsertFile(repoFullName, path, content, `Naze: edit ${path}`, branch, sha);
    return new Response(JSON.stringify({ ok: true, sha: result.content.sha }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    const message = (err as Error).message;
    const conflict = message.includes("409") || message.includes("422");
    return new Response(
      JSON.stringify({
        ok: false,
        conflict,
        message: conflict
          ? "File ini sudah berubah di GitHub sejak terakhir dibuka. Reload file sebelum menyimpan lagi."
          : message
      }),
      { status: conflict ? 409 : 500, headers: { "content-type": "application/json" } }
    );
  }
}

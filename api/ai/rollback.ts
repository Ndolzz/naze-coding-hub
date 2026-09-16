/**
 * UNDO AI CHANGE — Phase 18. Mengembalikan file ke isi SEBELUM Naze AI
 * mengubahnya, memakai `oldContent` yang sudah dikembalikan endpoint
 * implement.ts sesaat setelah commit. Ini "restore previous version"
 * sederhana (spec §24) — BUKAN version control penuh, cuma satu langkah
 * mundur dari perubahan AI terakhir.
 */
import { getFile, upsertFile, deleteFile } from "../github/contents";
import { assertSafePath } from "../github/pathSafety";

interface RollbackItem {
  path: string;
  action: "create" | "modify" | "delete";
  oldContent: string | null;
}

interface RollbackBody {
  repoFullName: string;
  branch: string;
  items: RollbackItem[];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = (await req.json()) as RollbackBody;

  const results: { path: string; status: "success" | "failed"; error?: string }[] = [];

  for (const item of body.items) {
    try {
      assertSafePath(item.path);

      if (item.action === "create") {
        // file baru dibuat AI -> rollback = hapus lagi
        const f = await getFile(body.repoFullName, item.path, body.branch);
        await deleteFile(body.repoFullName, item.path, `Naze: rollback (undo create ${item.path})`, body.branch, f.sha);
      } else if (item.action === "delete") {
        // file dihapus AI -> rollback = buat ulang dengan isi lama
        if (item.oldContent !== null) {
          await upsertFile(body.repoFullName, item.path, item.oldContent, `Naze: rollback (undo delete ${item.path})`, body.branch);
        }
      } else {
        // modify -> rollback = tulis lagi isi lama
        const f = await getFile(body.repoFullName, item.path, body.branch);
        await upsertFile(
          body.repoFullName,
          item.path,
          item.oldContent ?? "",
          `Naze: rollback (undo modify ${item.path})`,
          body.branch,
          f.sha
        );
      }
      results.push({ path: item.path, status: "success" });
    } catch (err) {
      results.push({ path: item.path, status: "failed", error: (err as Error).message });
    }
  }

  return new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } });
}

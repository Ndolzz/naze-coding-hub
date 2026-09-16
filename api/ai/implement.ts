/**
 * Vercel Serverless Function — Gemini (Implementer), Phase 15 + Phase 16/18.
 *
 * Dua mode:
 * - dryRun=true  -> generate isi file lewat Gemini TAPI TIDAK COMMIT.
 *                   Dipakai untuk AI Action Preview / diff (Phase 18)
 *                   sebelum user approve.
 * - dryRun=false -> commit sungguhan. Kalau `preGenerated` dikirim (hasil
 *                   dari dry run yang sudah dilihat user), pakai isi itu
 *                   apa adanya — TIDAK generate ulang lewat Gemini, supaya
 *                   yang di-commit persis yang sudah di-approve user
 *                   (WYSIWYG, bukan generate diam-diam beda hasil).
 *
 * Response selalu menyertakan oldContent per item, dipakai frontend untuk
 * rollback ("Undo AI Change", Phase 18).
 */
import { getFile, upsertFile } from "../github/contents";
import { createFile, deletePath } from "../github/files";
import { readConfig } from "../github/config";
import { callGemini } from "./geminiClient";
import { assertSafePath, assertSafeContentSize } from "../github/pathSafety";

interface PlanItem {
  action: "create" | "modify" | "delete";
  path: string;
  reason: string;
}

interface PreGenerated {
  path: string;
  content: string | null; // null untuk delete
}

interface ImplementBody {
  repoFullName: string;
  branch: string;
  userRequest: string;
  plan: PlanItem[];
  dryRun?: boolean;
  preGenerated?: PreGenerated[];
}

interface ItemResult {
  path: string;
  action: PlanItem["action"];
  status: "success" | "failed" | "preview";
  error?: string;
  oldContent?: string | null;
  newContent?: string | null;
}

const CODE_SYSTEM_PROMPT = `Kamu berperan sebagai NAZE IMPLEMENTER di dalam NAZE CODING HUB.
Tugasmu: menulis ISI FILE LENGKAP sesuai instruksi — bukan diff, bukan potongan kode, bukan penjelasan.
ATURAN KETAT:
- Balas HANYA isi file mentah (raw), tanpa markdown code fence (\`\`\`), tanpa komentar pembuka/penutup di luar isi file itu sendiri.
- Kalau ini file yang sudah ada (modify), kamu akan diberi isi lama sebagai konteks — hasilkan versi LENGKAP yang sudah diperbarui, bukan cuma bagian yang berubah.
- Tulis kode yang valid dan siap pakai untuk bahasa/format file tersebut (lihat ekstensi path-nya).`;

function stripFences(raw: string): string {
  return raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = (await req.json()) as ImplementBody;
  const dryRun = Boolean(body.dryRun);

  if ((dryRun || !body.preGenerated) && !process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY belum dikonfigurasi di Vercel." }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  let geminiModel: string | undefined;
  try {
    const { config } = await readConfig();
    geminiModel = (config.settings?.ai as { geminiModel?: string })?.geminiModel;
  } catch {
    // pakai default di geminiClient.ts
  }

  const MAX_PLAN_ITEMS = 20; // resource limit (spec §51) — cegah satu plan bikin ratusan commit sekaligus
  if (body.plan.length > MAX_PLAN_ITEMS) {
    return new Response(
      JSON.stringify({ error: `Plan berisi ${body.plan.length} item, melebihi batas ${MAX_PLAN_ITEMS}. Pecah jadi beberapa request.` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const results: ItemResult[] = [];
  const preGenMap = new Map((body.preGenerated ?? []).map((p) => [p.path, p.content]));

  for (const item of body.plan) {
    try {
      assertSafePath(item.path); // spec §51 — AI tidak boleh keluar dari workspace project

      // ---- DELETE: tidak perlu generate, cukup baca isi lama untuk rollback ----
      if (item.action === "delete") {
        let oldContent: string | null = null;
        try {
          const f = await getFile(body.repoFullName, item.path, body.branch);
          oldContent = Buffer.from(f.content, "base64").toString("utf-8");
        } catch {
          // file sudah tidak ada
        }

        if (dryRun) {
          results.push({ path: item.path, action: item.action, status: "preview", oldContent, newContent: null });
          continue;
        }

        if (oldContent !== null) {
          await deletePath(body.repoFullName, body.branch, item.path, "file");
        }
        results.push({ path: item.path, action: item.action, status: "success", oldContent, newContent: null });
        continue;
      }

      // ---- CREATE / MODIFY ----
      let existingContent = "";
      let sha: string | undefined;
      try {
        const f = await getFile(body.repoFullName, item.path, body.branch);
        existingContent = Buffer.from(f.content, "base64").toString("utf-8");
        sha = f.sha;
      } catch {
        // belum ada -> create
      }

      let newContent: string;
      if (preGenMap.has(item.path) && preGenMap.get(item.path) !== null) {
        newContent = preGenMap.get(item.path) as string;
      } else {
        const prompt = [
          `PERMINTAAN USER:\n${body.userRequest}`,
          `\nFILE: ${item.path}`,
          `ALASAN PERUBAHAN INI (dari Analyzer):\n${item.reason}`,
          existingContent ? `\nISI FILE SAAT INI:\n${existingContent.slice(0, 6000)}` : "\nFile ini belum ada — buat dari awal."
        ].join("\n");
        const rawContent = await callGemini(CODE_SYSTEM_PROMPT, prompt, { model: geminiModel });
        newContent = stripFences(rawContent);
      }

      if (!newContent) throw new Error("Isi file baru kosong.");
      assertSafeContentSize(newContent);

      if (dryRun) {
        results.push({
          path: item.path,
          action: item.action,
          status: "preview",
          oldContent: existingContent || null,
          newContent
        });
        continue;
      }

      if (sha) {
        await upsertFile(body.repoFullName, item.path, newContent, `Naze AI: ${item.reason}`, body.branch, sha);
      } else {
        await createFile(body.repoFullName, body.branch, item.path, newContent);
      }

      results.push({
        path: item.path,
        action: item.action,
        status: "success",
        oldContent: existingContent || null,
        newContent
      });
    } catch (err) {
      results.push({ path: item.path, action: item.action, status: "failed", error: (err as Error).message });
    }
  }

  return new Response(JSON.stringify({ results, dryRun }), { status: 200, headers: { "content-type": "application/json" } });
}

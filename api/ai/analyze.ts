/**
 * Vercel Serverless Function — Claude (Architect/Analyzer), Phase 14.
 *
 * Menegakkan spec §25 secara MEKANIS, bukan cuma instruksi di prompt:
 * "Claude tidak boleh mengarang isi file yang belum dibaca." Jadi alurnya
 * dua tahap:
 *   Pass 1 — Claude cuma dikasih daftar path (tanpa isi) + request user.
 *            Kalau dia butuh baca file, dia HARUS minta lewat needsFiles;
 *            dia tidak dikasih isi file kecuali eksplisit minta.
 *   Pass 2 — file yang diminta beneran dibaca dari GitHub, baru dikirim
 *            balik ke Claude untuk analisis final + Naze Plan.
 */
import { listTree } from "../github/files";
import { getFile } from "../github/contents";
import { readConfig } from "../github/config";
import { callClaude, parseJsonResponse } from "./claudeClient";
import { callGemini } from "./geminiClient";

interface AnalyzeBody {
  repoFullName: string;
  branch: string;
  userRequest: string;
  openFilePath?: string;
  buildLogs?: string;
}

interface Pass1Response {
  needsFiles: string[];
  analysis: string | null;
  plan: NazePlanItem[] | null;
}

interface NazePlanItem {
  action: "create" | "modify" | "delete";
  path: string;
  reason: string;
}

interface FinalResponse {
  analysis: string;
  plan: NazePlanItem[];
  provider: "claude" | "gemini";
}

const SYSTEM_PROMPT = `Kamu berperan sebagai NAZE ANALYZER (arsitektur/analisis) di dalam NAZE CODING HUB.
Tugasmu: menganalisis project, merencanakan perubahan (bukan menulis kode — itu tugas Implementer),
melakukan code review/security review level tinggi, dan memecah task jadi rencana yang jelas.

ATURAN KETAT:
- JANGAN PERNAH mengarang isi file yang belum kamu baca. Kamu hanya diberi daftar PATH di awal, bukan isinya.
- Kalau kamu butuh baca file tertentu sebelum bisa memberi analisis final, balas HANYA JSON:
  {"needsFiles": ["path/a.ts", "path/b.ts"], "analysis": null, "plan": null}
- Kalau kamu SUDAH cukup informasi (baik dari awal atau setelah dikasih isi file), balas HANYA JSON:
  {"needsFiles": [], "analysis": "<analisis singkat, bahasa Indonesia>", "plan": [{"action":"create|modify|delete","path":"...","reason":"..."}]}
- plan boleh kosong array kalau memang tidak ada perubahan file yang diperlukan (mis. pertanyaan penjelasan saja).
- JANGAN keluarkan teks lain selain JSON itu sendiri — tidak ada markdown fence, tidak ada penjelasan di luar JSON.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = (await req.json()) as AnalyzeBody;

  try {
    let claudeModel: string | undefined;
    let geminiModel: string | undefined;
    // Default 'gemini' — Claude API tidak punya tier gratis, Gemini punya
    // (Google AI Studio). Ganti ke 'claude' lewat .naze/config.json
    // (settings.ai.analyzerProvider) begitu siap pakai Claude untuk
    // kualitas analisis yang lebih baik. Ini bukan perubahan peran resmi
    // Claude=Architect/Gemini=Implementer (spec §16-17) — cuma pilihan
    // sementara demi biaya nol saat development.
    let analyzerProvider: "claude" | "gemini" = "gemini";
    try {
      const { config } = await readConfig();
      const ai = config.settings?.ai as { claudeModel?: string; geminiModel?: string; analyzerProvider?: "claude" | "gemini" };
      claudeModel = ai?.claudeModel;
      geminiModel = ai?.geminiModel;
      if (ai?.analyzerProvider) analyzerProvider = ai.analyzerProvider;
    } catch {
      // NAZE_CONFIG_REPO belum siap atau config belum ada — pakai default
    }

    if (analyzerProvider === "claude" && !process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY belum dikonfigurasi di Vercel." }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }
    if (analyzerProvider === "gemini" && !process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY belum dikonfigurasi di Vercel." }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    async function callAnalyzer(prompt: string, maxTokens: number): Promise<string> {
      if (analyzerProvider === "claude") return callClaude(SYSTEM_PROMPT, prompt, { model: claudeModel, maxTokens });
      return callGemini(SYSTEM_PROMPT, prompt, { model: geminiModel });
    }

    const tree = await listTree(body.repoFullName, body.branch);
    const paths = tree.map((t) => t.path).filter((p) => !p.endsWith("/.gitkeep"));

    let openFileContent = "";
    if (body.openFilePath) {
      try {
        const f = await getFile(body.repoFullName, body.openFilePath, body.branch);
        openFileContent = Buffer.from(f.content, "base64").toString("utf-8").slice(0, 6000);
      } catch {
        // file mungkin sudah dihapus/tidak ada — lanjut tanpa itu
      }
    }

    const pass1Prompt = [
      `PERMINTAAN USER:\n${body.userRequest}`,
      `\nSTRUKTUR PROJECT (${paths.length} file):\n${paths.slice(0, 300).join("\n")}`,
      body.openFilePath ? `\nFILE SEDANG DIBUKA (${body.openFilePath}):\n${openFileContent}` : "",
      body.buildLogs ? `\nLOG BUILD TERAKHIR (dipotong):\n${body.buildLogs.slice(0, 4000)}` : ""
    ].join("\n");

    const pass1Raw = await callAnalyzer(pass1Prompt, 1200);
    const pass1 = parseJsonResponse<Pass1Response>(pass1Raw);

    if (pass1.needsFiles.length === 0 && pass1.analysis) {
      const result: FinalResponse = { analysis: pass1.analysis, plan: pass1.plan ?? [], provider: analyzerProvider };
      return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
    }

    // Pass 2 — beneran baca file yang diminta (dibatasi 8 file, masing-masing dipotong)
    const filesToRead = pass1.needsFiles.slice(0, 8);
    const fileContents: string[] = [];
    for (const path of filesToRead) {
      try {
        const f = await getFile(body.repoFullName, path, body.branch);
        const content = Buffer.from(f.content, "base64").toString("utf-8").slice(0, 4000);
        fileContents.push(`--- ${path} ---\n${content}`);
      } catch (err) {
        fileContents.push(`--- ${path} ---\n(gagal dibaca: ${(err as Error).message})`);
      }
    }

    const pass2Prompt = `${pass1Prompt}\n\nISI FILE YANG KAMU MINTA:\n${fileContents.join("\n\n")}\n\nSekarang beri analisis final + plan (needsFiles harus kosong).`;
    const pass2Raw = await callAnalyzer(pass2Prompt, 1600);
    const pass2 = parseJsonResponse<Pass1Response>(pass2Raw);

    const result: FinalResponse = {
      analysis: pass2.analysis ?? "Tidak ada analisis final.",
      plan: pass2.plan ?? [],
      provider: analyzerProvider
    };
    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

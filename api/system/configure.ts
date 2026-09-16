/**
 * Vercel Serverless Function — Phase 5 (CONNECT YOUR AI).
 *
 * KETERBATASAN PENTING yang harus dipahami sebelum pakai endpoint ini:
 * Vercel serverless function TIDAK punya filesystem persisten di production
 * (read-only, di-redeploy tiap kali). Jadi endpoint ini HANYA bisa menyimpan
 * key secara nyata saat dijalankan lokal (`vercel dev` / `npm run dev`),
 * dengan menulis ke `.env.local` (sudah di-gitignore). Di production,
 * satu-satunya cara valid menyimpan API key adalah lewat Vercel Project
 * Settings → Environment Variables — endpoint ini akan menolak dan
 * mengarahkan ke sana, BUKAN pura-pura berhasil (spec §55: No Fake Features).
 */
import { promises as fs } from "fs";
import path from "path";

interface ConfigureBody {
  claudeApiKey?: string;
  geminiApiKey?: string;
  reset?: "claude" | "gemini";
}

const isProduction = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "development";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (isProduction) {
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "read_only_environment",
        message:
          "Vercel production tidak mengizinkan penulisan file saat runtime. Set ANTHROPIC_API_KEY dan GEMINI_API_KEY lewat Vercel Project Settings → Environment Variables, lalu redeploy."
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const body = (await req.json()) as ConfigureBody;
  if (!body.claudeApiKey && !body.geminiApiKey && !body.reset) {
    return new Response(
      JSON.stringify({ ok: false, reason: "empty_body", message: "Tidak ada key yang dikirim." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let existing = "";
    try {
      existing = await fs.readFile(envPath, "utf-8");
    } catch {
      existing = "";
    }

    let lines = existing.split("\n").filter(Boolean);
    const setLine = (key: string, value: string) => {
      const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
      const line = `${key}=${value}`;
      if (idx >= 0) lines[idx] = line;
      else lines.push(line);
    };
    const removeLine = (key: string) => {
      lines = lines.filter((l) => !l.startsWith(`${key}=`));
    };

    if (body.reset === "claude") removeLine("ANTHROPIC_API_KEY");
    if (body.reset === "gemini") removeLine("GEMINI_API_KEY");
    if (body.claudeApiKey) setLine("ANTHROPIC_API_KEY", body.claudeApiKey);
    if (body.geminiApiKey) setLine("GEMINI_API_KEY", body.geminiApiKey);

    await fs.writeFile(envPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");

    return new Response(
      JSON.stringify({
        ok: true,
        message: body.reset
          ? "Key dihapus dari .env.local. Restart `npm run dev` supaya perubahan terbaca."
          : "Disimpan ke .env.local. Restart `npm run dev` supaya key terbaca."
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, reason: "write_failed", message: (err as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

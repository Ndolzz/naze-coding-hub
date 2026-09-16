/**
 * Vercel Serverless Function — Phase 6/7 (Claude & Gemini Validation).
 *
 * Melakukan pengecekan NYATA ke provider (bukan cuma "apakah input kosong",
 * sesuai spec §4). Key selalu dibaca dari server env (ANTHROPIC_API_KEY /
 * GEMINI_API_KEY) — tidak pernah menerima key mentah dari client di sini,
 * supaya key tidak pernah lewat network dua kali lipat lebih dari perlu.
 */

type Provider = "claude" | "gemini";

interface ValidateBody {
  provider: Provider;
}

async function validateClaude(): Promise<{ valid: boolean; message: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { valid: false, message: "ANTHROPIC_API_KEY belum dikonfigurasi." };

  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      }
    });
    if (res.ok) return { valid: true, message: "Claude terhubung." };
    if (res.status === 401) return { valid: false, message: "Claude API key ditolak (401 Unauthorized)." };
    return { valid: false, message: `Claude API mengembalikan status ${res.status}.` };
  } catch (err) {
    return { valid: false, message: `Gagal menghubungi Claude API: ${(err as Error).message}` };
  }
}

async function validateGemini(): Promise<{ valid: boolean; message: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { valid: false, message: "GEMINI_API_KEY belum dikonfigurasi." };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    );
    if (res.ok) return { valid: true, message: "Gemini terhubung." };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { valid: false, message: "Gemini API key ditolak." };
    }
    return { valid: false, message: `Gemini API mengembalikan status ${res.status}.` };
  } catch (err) {
    return { valid: false, message: `Gagal menghubungi Gemini API: ${(err as Error).message}` };
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await req.json()) as ValidateBody;
  if (body.provider !== "claude" && body.provider !== "gemini") {
    return new Response(JSON.stringify({ error: "provider harus 'claude' atau 'gemini'." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const result = body.provider === "claude" ? await validateClaude() : await validateGemini();

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

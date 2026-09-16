/**
 * Client tipis untuk Claude Messages API — dipakai Claude Analyzer (Phase 14).
 * Default claude-haiku-4-5-20251001 (paling murah/cepat) untuk tahap
 * development — bukan model gratis (Claude API tidak punya tier gratis),
 * cuma paling hemat biaya buat testing. Ganti lewat .naze/config.json
 * (settings.ai.claudeModel) begitu siap pindah ke Sonnet untuk kualitas
 * analisis yang lebih baik di production.
 */

export async function callClaude(
  systemPrompt: string,
  userContent: string,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY belum dikonfigurasi.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: opts.model ?? "claude-haiku-4-5-20251001",
      max_tokens: opts.maxTokens ?? 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const textBlock = (data.content as Array<{ type: string; text?: string }>).find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Claude tidak mengembalikan teks.");
  return textBlock.text;
}

/** Strip ```json fences kalau model membungkus jawabannya, lalu parse. */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleaned) as T;
}

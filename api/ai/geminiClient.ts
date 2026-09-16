/**
 * Client tipis untuk Gemini API — dipakai sebagai opsi hemat biaya untuk
 * peran Analyzer selama development (lihat catatan di analyze.ts). Peran
 * resminya Gemini tetap Implementer (spec §17); dipakai dobel di sini
 * murni soal biaya sementara, bukan perubahan arsitektur permanen.
 * Model default: gemini-3.6-flash (Gemini 3 series, stabil per Juli 2026).
 */

export async function callGemini(
  systemPrompt: string,
  userContent: string,
  opts: { model?: string } = {}
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

  const model = opts.model ?? "gemini-3.6-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }]
      })
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini tidak mengembalikan teks.");
  return text as string;
}

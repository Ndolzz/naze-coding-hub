/**
 * Vercel Serverless Function — dipakai oleh Naze Boot (Phase 4) dan API
 * Setup (Phase 5). Melaporkan APAKAH env var sudah dikonfigurasi di server,
 * tanpa pernah mengembalikan isi key-nya (spec §6, §49).
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const status = {
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN)
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

/**
 * GET daftar semua Naze Project (Phase 8).
 */
import { readConfig } from "../github/config";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  try {
    const { config } = await readConfig();
    return new Response(JSON.stringify(config.projects), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

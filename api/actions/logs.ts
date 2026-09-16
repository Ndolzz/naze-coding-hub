/**
 * Log mentah sebuah job (Phase 11) — real log dari GitHub Actions, sudah
 * dipotong kalau kepanjangan (lihat MAX_LOG_CHARS di github/actions.ts).
 */
import { getJobLogs } from "../github/actions";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, jobId } = (await req.json()) as { repoFullName: string; jobId: number };

  try {
    const logs = await getJobLogs(repoFullName, jobId);
    return new Response(JSON.stringify({ logs }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

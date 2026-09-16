/**
 * Detail jobs + steps sebuah run (Phase 11).
 */
import { listRunJobs } from "../github/actions";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, runId } = (await req.json()) as { repoFullName: string; runId: number };

  try {
    const jobs = await listRunJobs(repoFullName, runId);
    return new Response(JSON.stringify(jobs), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

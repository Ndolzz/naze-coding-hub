/**
 * Daftar workflow run terbaru sebuah project (Build & Logs Viewer, Phase 11).
 */
import { listWorkflowRuns } from "../github/actions";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName } = (await req.json()) as { repoFullName: string };

  try {
    const runs = await listWorkflowRuns(repoFullName);
    return new Response(JSON.stringify(runs), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

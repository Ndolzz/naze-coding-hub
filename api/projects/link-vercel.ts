/**
 * Hubungkan Naze Project ke Vercel Project (Phase 13 — Preview).
 * Preview live cuma bisa nampilin hasil deployment sungguhan; tidak ada
 * cara jujur untuk "preview" tanpa build nyata di arsitektur full-Vercel.
 */
import { readConfig, writeConfig } from "../github/config";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { id, vercelProjectId } = (await req.json()) as { id: string; vercelProjectId: string };

  try {
    const { config, sha } = await readConfig();
    const project = config.projects.find((p) => p.id === id);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }
    project.vercelProjectId = vercelProjectId.trim();
    await writeConfig(config, sha, `Naze: link ${project.name} ke Vercel project ${vercelProjectId}`);
    return new Response(JSON.stringify(project), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

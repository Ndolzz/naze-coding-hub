/**
 * EXPORT PROJECT (Phase 8). Pakai fitur archive resmi GitHub
 * (codeload) — bukan bikin zip sendiri.
 */
import { readConfig } from "../github/config";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { id } = (await req.json()) as { id: string };

  try {
    const { config } = await readConfig();
    const project = config.projects.find((p) => p.id === id);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    const archiveUrl = `https://github.com/${project.repoFullName}/archive/refs/heads/${project.defaultBranch}.zip`;
    return new Response(JSON.stringify({ archiveUrl }), {
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

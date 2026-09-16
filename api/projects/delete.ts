/**
 * DELETE PROJECT (Phase 8). Destructive — frontend WAJIB minta konfirmasi
 * lewat custom Naze modal sebelum memanggil ini (spec §22).
 */
import { readConfig, writeConfig } from "../github/config";
import { deleteRepo } from "../github/repos";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { id, alsoDeleteRepo } = (await req.json()) as { id: string; alsoDeleteRepo?: boolean };

  try {
    const { config, sha } = await readConfig();
    const project = config.projects.find((p) => p.id === id);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    let repoDeleteError: string | null = null;
    if (alsoDeleteRepo) {
      try {
        await deleteRepo(project.repoFullName);
      } catch (err) {
        repoDeleteError = (err as Error).message; // tetap lanjut hapus dari daftar Naze
      }
    }

    config.projects = config.projects.filter((p) => p.id !== id);
    await writeConfig(config, sha, `Naze: delete project ${project.name}`);

    return new Response(JSON.stringify({ ok: true, repoDeleteError }), {
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

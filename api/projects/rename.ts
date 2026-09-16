/**
 * RENAME PROJECT (Phase 8). Default: ganti nama tampilan saja.
 * `alsoRenameRepo: true` untuk benar-benar rename repo GitHub-nya.
 */
import { readConfig, writeConfig } from "../github/config";
import { renameRepo } from "../github/repos";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { id, newName, alsoRenameRepo } = (await req.json()) as {
    id: string;
    newName: string;
    alsoRenameRepo?: boolean;
  };

  try {
    const { config, sha } = await readConfig();
    const project = config.projects.find((p) => p.id === id);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    project.name = newName.trim();

    if (alsoRenameRepo) {
      const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const updated = await renameRepo(project.repoFullName, slug);
      project.repoFullName = updated.full_name;
    }

    await writeConfig(config, sha, `Naze: rename project ke ${newName}`);
    return new Response(JSON.stringify(project), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

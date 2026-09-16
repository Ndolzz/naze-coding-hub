/**
 * Ganti branch kerja aktif sebuah Naze Project (Phase 12). TIDAK mengubah
 * default branch repo GitHub-nya — cuma menentukan branch mana yang dipakai
 * File Explorer/Editor/Build/Git panel di Naze.
 */
import { readConfig, writeConfig } from "../github/config";
import { listBranches } from "../github/git";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { id, branch } = (await req.json()) as { id: string; branch: string };

  try {
    const { config, sha } = await readConfig();
    const project = config.projects.find((p) => p.id === id);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    const branches = await listBranches(project.repoFullName);
    if (!branches.some((b) => b.name === branch)) {
      return new Response(JSON.stringify({ error: `Branch '${branch}' tidak ditemukan di repo.` }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    project.activeBranch = branch;
    await writeConfig(config, sha, `Naze: switch branch ${project.name} -> ${branch}`);

    return new Response(JSON.stringify(project), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

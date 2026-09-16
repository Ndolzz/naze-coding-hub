/**
 * IMPORT PROJECT (Phase 8). Daftarkan repo GitHub yang sudah ada sebagai
 * Naze Project — verifikasi dulu repo-nya benar-benar bisa diakses.
 */
import { readConfig, writeConfig, NazeProjectEntry } from "../github/config";
import { getRepo } from "../github/repos";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { repoFullName, name } = (await req.json()) as { repoFullName: string; name?: string };

  try {
    const repo = await getRepo(repoFullName);

    const entry: NazeProjectEntry = {
      id: crypto.randomUUID(),
      name: name?.trim() || repo.name,
      repoFullName: repo.full_name,
      defaultBranch: repo.default_branch ?? "main",
      createdAt: new Date().toISOString()
    };

    const { config, sha } = await readConfig();
    if (config.projects.some((p) => p.repoFullName === entry.repoFullName)) {
      return new Response(JSON.stringify({ error: "Repo ini sudah terdaftar sebagai project." }), {
        status: 409,
        headers: { "content-type": "application/json" }
      });
    }

    config.projects.push(entry);
    await writeConfig(config, sha, `Naze: import project ${entry.name}`);

    return new Response(JSON.stringify(entry), { status: 201, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

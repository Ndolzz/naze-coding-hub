/**
 * CREATE PROJECT (Phase 8). Bikin repo GitHub baru + daftarkan di config.
 */
import { readConfig, writeConfig, NazeProjectEntry } from "../github/config";
import { createRepo, getAuthenticatedUser } from "../github/repos";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "naze-project";
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: "Nama project wajib diisi." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const repoSlug = slugify(name);
    const repo = await createRepo(repoSlug);
    const user = await getAuthenticatedUser();

    const entry: NazeProjectEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      repoFullName: `${user.login}/${repo.name}`,
      defaultBranch: repo.default_branch ?? "main",
      createdAt: new Date().toISOString()
    };

    const { config, sha } = await readConfig();
    config.projects.push(entry);
    await writeConfig(config, sha, `Naze: create project ${entry.name}`);

    return new Response(JSON.stringify(entry), { status: 201, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

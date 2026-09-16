/**
 * DUPLICATE PROJECT (Phase 8). Bikin repo baru, salin isi tree dari repo
 * sumber file-per-file lewat Git Data API — bukan fake copy.
 */
import { readConfig, writeConfig, NazeProjectEntry } from "../github/config";
import { createRepo, getAuthenticatedUser, getTreeRecursive, getBlob } from "../github/repos";
import { upsertFile } from "../github/contents";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "naze-project";
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { id, newName } = (await req.json()) as { id: string; newName: string };

  try {
    const { config, sha } = await readConfig();
    const source = config.projects.find((p) => p.id === id);
    if (!source) {
      return new Response(JSON.stringify({ error: "Project sumber tidak ditemukan." }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    const newRepoSlug = slugify(newName);
    const newRepo = await createRepo(newRepoSlug);
    const user = await getAuthenticatedUser();
    const newRepoFullName = `${user.login}/${newRepo.name}`;

    const blobs = await getTreeRecursive(source.repoFullName, source.defaultBranch);
    for (const blob of blobs) {
      const content = await getBlob(source.repoFullName, blob.sha);
      await upsertFile(
        newRepoFullName,
        blob.path,
        Buffer.from(content, "base64").toString("utf-8"),
        `Naze: duplicate from ${source.repoFullName}`,
        newRepo.default_branch ?? "main"
      );
    }

    const entry: NazeProjectEntry = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      repoFullName: newRepoFullName,
      defaultBranch: newRepo.default_branch ?? "main",
      createdAt: new Date().toISOString()
    };

    config.projects.push(entry);
    await writeConfig(config, sha, `Naze: duplicate project ${source.name} -> ${entry.name}`);

    return new Response(JSON.stringify(entry), { status: 201, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

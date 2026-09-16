/**
 * Operasi file/folder di atas repo GitHub — dipakai File Explorer (Phase 9).
 * Git tidak punya "folder" asli; folder disimulasikan lewat prefix path,
 * dan folder kosong butuh placeholder `.gitkeep` (satu-satunya cara nyata
 * bikin folder kosong tetap ter-commit di Git).
 */
import { getFile, upsertFile, deleteFile } from "./contents";
import { getTreeRecursive, getBlob } from "./repos";

export interface TreeEntry {
  path: string;
  type: "blob";
  sha: string;
  size?: number;
}

export async function listTree(repoFullName: string, branch: string): Promise<TreeEntry[]> {
  return getTreeRecursive(repoFullName, branch) as unknown as Promise<TreeEntry[]>;
}

export async function createFile(repoFullName: string, branch: string, path: string, content = "") {
  return upsertFile(repoFullName, path, content, `Naze: create ${path}`, branch);
}

export async function createFolder(repoFullName: string, branch: string, path: string) {
  return createFile(repoFullName, branch, `${path}/.gitkeep`, "");
}

export async function deletePath(repoFullName: string, branch: string, path: string, type: "file" | "folder") {
  if (type === "file") {
    const file = await getFile(repoFullName, path, branch);
    await deleteFile(repoFullName, path, `Naze: delete ${path}`, branch, file.sha);
    return;
  }

  const tree = await listTree(repoFullName, branch);
  const prefix = `${path}/`;
  const targets = tree.filter((t) => t.path === path || t.path.startsWith(prefix));
  for (const t of targets) {
    await deleteFile(repoFullName, t.path, `Naze: delete ${t.path}`, branch, t.sha);
  }
}

export async function movePath(
  repoFullName: string,
  branch: string,
  oldPath: string,
  newPath: string,
  type: "file" | "folder",
  keepOriginal = false
) {
  if (type === "file") {
    const file = await getFile(repoFullName, oldPath, branch);
    const content = Buffer.from(file.content, "base64").toString("utf-8");
    await upsertFile(repoFullName, newPath, content, `Naze: move ${oldPath} -> ${newPath}`, branch);
    if (!keepOriginal) {
      await deleteFile(repoFullName, oldPath, `Naze: move ${oldPath} -> ${newPath}`, branch, file.sha);
    }
    return;
  }

  const tree = await listTree(repoFullName, branch);
  const prefix = `${oldPath}/`;
  const targets = tree.filter((t) => t.path === oldPath || t.path.startsWith(prefix));
  for (const t of targets) {
    const suffix = t.path.slice(oldPath.length);
    const destPath = `${newPath}${suffix}`;
    const content = await getBlob(repoFullName, t.sha);
    await upsertFile(
      repoFullName,
      destPath,
      Buffer.from(content, "base64").toString("utf-8"),
      `Naze: move ${t.path} -> ${destPath}`,
      branch
    );
    if (!keepOriginal) {
      await deleteFile(repoFullName, t.path, `Naze: move ${t.path} -> ${destPath}`, branch, t.sha);
    }
  }
}

export async function copyPath(
  repoFullName: string,
  branch: string,
  oldPath: string,
  newPath: string,
  type: "file" | "folder"
) {
  return movePath(repoFullName, branch, oldPath, newPath, type, true);
}

/**
 * Logika murni buat membangun tree nested dari flat list path GitHub
 * (dipisah dari NazeFileExplorer.tsx supaya bisa di-unit-test langsung —
 * Phase 24).
 */
export interface TreeEntry {
  path: string;
  size?: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  children: FileNode[];
}

export function buildTree(entries: TreeEntry[]): FileNode[] {
  const root: FileNode[] = [];
  for (const entry of entries) {
    if (entry.path.endsWith("/.gitkeep")) continue; // placeholder folder kosong, jangan tampilkan sbg file
    const parts = entry.path.split("/");
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: acc, type: isLeaf ? "file" : "folder", children: [] };
        if (isLeaf) node.size = entry.size;
        level.push(node);
      }
      level = node.children;
    });
  }
  const sortRec = (nodes: FileNode[]) => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(root);
  return root;
}

export function formatSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

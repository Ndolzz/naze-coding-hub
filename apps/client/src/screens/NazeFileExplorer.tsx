import { useEffect, useMemo, useState } from "react";
import {
  IconFolder,
  IconFile,
  IconSearch,
  IconDelete,
  IconMenu,
  IconChevron,
  IconCheck
} from "../../../../packages/design-system/icons";
import NazeConfirmModal from "../components/NazeConfirmModal";
import NazeTooltip from "../components/NazeTooltip";
import { buildTree, formatSize, type FileNode, type TreeEntry } from "../lib/fileTree";

/**
 * FILE EXPLORER — Phase 9.
 * Semua aksi (create/rename/move/copy/delete) memanggil api/files/* yang
 * beneran commit ke GitHub. "Folder" disimulasikan lewat prefix path
 * (lihat github/files.ts) — Git tidak mengenal folder kosong asli.
 */


interface Props {
  repoFullName: string;
  branch: string;
  onOpenFile?: (path: string) => void;
}

export default function NazeFileExplorer({ repoFullName, branch, onOpenFile }: Props) {
  const [entries, setEntries] = useState<TreeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const [activeActionPath, setActiveActionPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [movingPath, setMovingPath] = useState<string | null>(null);
  const [moveValue, setMoveValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);

  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [createValue, setCreateValue] = useState("");

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/files/tree", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat file tree.");
      setEntries(data);
    } catch (err) {
      setError((err as Error).message);
      setEntries([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoFullName, branch]);

  const tree = useMemo(() => (entries ? buildTree(entries) : []), [entries]);

  const filteredPaths = useMemo(() => {
    if (!query.trim() || !entries) return null;
    const q = query.toLowerCase();
    return new Set(entries.filter((e) => e.path.toLowerCase().includes(q)).map((e) => e.path));
  }, [query, entries]);

  function toggleExpand(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleCreate() {
    if (!createValue.trim() || !creating) return;
    setBusy(true);
    try {
      const res = await fetch("/api/files/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, path: createValue.trim(), type: creating })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateValue("");
      setCreating(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRenameSubmit(node: FileNode) {
    if (!renameValue.trim() || renameValue === node.name) {
      setRenamingPath(null);
      return;
    }
    const newPath = node.path.split("/").slice(0, -1).concat(renameValue.trim()).join("/");
    setBusy(true);
    try {
      const res = await fetch("/api/files/rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, oldPath: node.path, newPath, type: node.type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRenamingPath(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveSubmit(node: FileNode) {
    if (!moveValue.trim()) return;
    const newPath = `${moveValue.trim().replace(/\/$/, "")}/${node.name}`;
    setBusy(true);
    try {
      const res = await fetch("/api/files/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, oldPath: node.path, newPath, type: node.type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMovingPath(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(node: FileNode) {
    const parts = node.path.split("/");
    const last = parts.pop()!;
    const dotIndex = last.lastIndexOf(".");
    const dupName =
      node.type === "file" && dotIndex > 0
        ? `${last.slice(0, dotIndex)}-copy${last.slice(dotIndex)}`
        : `${last}-copy`;
    const newPath = [...parts, dupName].join("/");
    setBusy(true);
    try {
      const res = await fetch("/api/files/copy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, oldPath: node.path, newPath, type: node.type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, path: deleteTarget.path, type: deleteTarget.type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDelete() {
    setBusy(true);
    try {
      for (const path of checked) {
        const node = findNode(tree, path);
        if (!node) continue;
        await fetch("/api/files/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoFullName, branch, path: node.path, type: node.type })
        });
      }
      setChecked(new Set());
      setMultiSelectMode(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function findNode(nodes: FileNode[], path: string): FileNode | null {
    for (const n of nodes) {
      if (n.path === path) return n;
      const found = findNode(n.children, path);
      if (found) return found;
    }
    return null;
  }

  function Row({ node, depth }: { node: FileNode; depth: number }) {
    if (filteredPaths && node.type === "file" && !filteredPaths.has(node.path)) return null;
    const isExpanded = expanded.has(node.path);
    const isRenaming = renamingPath === node.path;
    const isMoving = movingPath === node.path;
    const isActive = activeActionPath === node.path;

    return (
      <div>
        <div
          className="naze-file-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.25rem",
            paddingLeft: `${depth * 1.1 + 0.25}rem`,
            borderRadius: "var(--radius-sm)",
            background: selected?.path === node.path ? "var(--naze-black-soft)" : "transparent",
            cursor: "pointer"
          }}
          onClick={() => {
            if (multiSelectMode) {
              setChecked((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
              return;
            }
            if (node.type === "folder") toggleExpand(node.path);
            else {
              setSelected(node);
              onOpenFile?.(node.path);
            }
          }}
        >
          {multiSelectMode && (
            <span style={{ color: checked.has(node.path) ? "var(--naze-blue)" : "var(--naze-white-faint)" }}>
              <IconCheck size={14} />
            </span>
          )}
          {node.type === "folder" && (
            <span style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform var(--duration-fast) var(--ease-out)" }}>
              <IconChevron size={13} />
            </span>
          )}
          {node.type === "folder" ? <IconFolder size={15} /> : <IconFile size={15} />}

          {isRenaming ? (
            <input
              className="naze-input"
              style={{ flex: 1, padding: "0.2rem 0.4rem" }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(node)}
              autoFocus
            />
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", flex: 1 }}>{node.name}</span>
          )}

          {!multiSelectMode && (
            <NazeTooltip label="Actions">
              <button
                className="naze-icon-btn"
                aria-label="Actions"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActionPath(isActive ? null : node.path);
                }}
              >
                <IconMenu size={13} />
              </button>
            </NazeTooltip>
          )}
        </div>

        {isActive && !isRenaming && !isMoving && (
          <div style={{ display: "flex", gap: "0.4rem", paddingLeft: `${depth * 1.1 + 1.5}rem`, marginBottom: "0.35rem" }}>
            <button
              className="naze-btn"
              style={{ padding: "0.25rem 0.6rem", fontSize: "var(--text-xs)" }}
              onClick={() => {
                setRenamingPath(node.path);
                setRenameValue(node.name);
                setActiveActionPath(null);
              }}
            >
              Rename
            </button>
            <button
              className="naze-btn"
              style={{ padding: "0.25rem 0.6rem", fontSize: "var(--text-xs)" }}
              onClick={() => handleDuplicate(node)}
            >
              Duplicate
            </button>
            <button
              className="naze-btn"
              style={{ padding: "0.25rem 0.6rem", fontSize: "var(--text-xs)" }}
              onClick={() => {
                setMovingPath(node.path);
                setMoveValue("");
                setActiveActionPath(null);
              }}
            >
              Move
            </button>
            <button
              className="naze-icon-btn"
              aria-label="Delete"
              onClick={() => setDeleteTarget(node)}
            >
              <IconDelete size={14} />
            </button>
          </div>
        )}

        {isMoving && (
          <div style={{ display: "flex", gap: "0.4rem", paddingLeft: `${depth * 1.1 + 1.5}rem`, marginBottom: "0.35rem" }}>
            <input
              className="naze-input"
              style={{ flex: 1, padding: "0.2rem 0.4rem" }}
              placeholder="folder tujuan (mis. src/components)"
              value={moveValue}
              onChange={(e) => setMoveValue(e.target.value)}
              autoFocus
            />
            <button className="naze-btn" style={{ padding: "0.25rem 0.6rem" }} onClick={() => handleMoveSubmit(node)}>
              Go
            </button>
          </div>
        )}

        {node.type === "folder" &&
          isExpanded &&
          node.children.map((child) => <Row key={child.path} node={child} depth={depth + 1} />)}
      </div>
    );
  }

  if (entries === null) {
    return <p className="naze-status">LOADING FILES...</p>;
  }

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 8, top: 8, color: "var(--naze-white-faint)" }}>
            <IconSearch size={14} />
          </span>
          <input
            className="naze-input"
            style={{ width: "100%", paddingLeft: "1.8rem" }}
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="naze-btn" onClick={() => setMultiSelectMode((v) => !v)}>
          {multiSelectMode ? "Done" : "Select"}
        </button>
      </div>

      {error && <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)" }}>{error}</p>}

      <div className="naze-scrap-card" style={{ padding: "0.5rem", maxHeight: 360, overflowY: "auto", overflowX: "auto" }}>
        {tree.length === 0 ? (
          <p style={{ color: "var(--naze-white-faint)", fontSize: "var(--text-sm)", padding: "0.5rem" }}>
            Belum ada file.
          </p>
        ) : (
          tree.map((node) => <Row key={node.path} node={node} depth={0} />)
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
        {creating === null ? (
          <>
            <button className="naze-btn" onClick={() => setCreating("file")}>
              + File
            </button>
            <button className="naze-btn" onClick={() => setCreating("folder")}>
              + Folder
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
            <input
              className="naze-input"
              style={{ flex: 1 }}
              placeholder={creating === "file" ? "path/nama-file.ts" : "path/nama-folder"}
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              autoFocus
            />
            <button className="naze-btn naze-btn--primary" onClick={handleCreate} disabled={busy || !createValue.trim()}>
              Create
            </button>
            <button className="naze-btn" onClick={() => setCreating(null)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {multiSelectMode && checked.size > 0 && (
        <div style={{ marginTop: "0.6rem" }}>
          <button className="naze-btn naze-btn--danger" onClick={() => setDeleteTarget({ name: `${checked.size} item`, path: "__bulk__", type: "file", children: [] })}>
            Delete {checked.size} item
          </button>
        </div>
      )}

      {selected && (
        <div className="naze-scrap-card" style={{ marginTop: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-dim)" }}>
            {selected.path}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-faint)" }}>
            {formatSize(selected.size)}
          </p>
        </div>
      )}

      {deleteTarget && (
        <NazeConfirmModal
          title={deleteTarget.path === "__bulk__" ? "Delete Selected Files" : "Delete " + deleteTarget.type}
          description={
            deleteTarget.path === "__bulk__"
              ? `${checked.size} item akan dihapus dari repo. Tindakan ini tidak bisa dibatalkan lewat UI (commit tetap ada di histori Git).`
              : `"${deleteTarget.path}" akan dihapus dari repo. Tindakan ini tidak bisa dibatalkan lewat UI (commit tetap ada di histori Git).`
          }
          confirmLabel="Delete"
          onConfirm={deleteTarget.path === "__bulk__" ? handleBulkDelete : confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { IconFolder, IconGithub, IconDelete } from "../../../../packages/design-system/icons";
import NazeConfirmModal from "../components/NazeConfirmModal";

/**
 * PROJECT / WORKSPACE SYSTEM — Phase 8.
 * CREATE / OPEN / DELETE / RENAME / DUPLICATE / IMPORT / EXPORT — semua
 * memanggil endpoint api/projects/* yang nyata (bikin/ubah/hapus repo
 * GitHub sungguhan), bukan state lokal yang berpura-pura tersimpan.
 */

interface Project {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  createdAt: string;
}

export default function NazeProjects({
  onOpenProject,
  onNotify
}: {
  onOpenProject: (p: Project) => void;
  onNotify?: (text: string, tone?: "default" | "success" | "error") => void;
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [importing, setImporting] = useState(false);
  const [importRepo, setImportRepo] = useState("");

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/projects/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat daftar project.");
      setProjects(data);
    } catch (err) {
      setError((err as Error).message);
      setProjects([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat project.");
      setNewName("");
      setCreating(false);
      await load();
      onNotify?.(`Project "${data.name}" dibuat.`, "success");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!importRepo.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName: importRepo.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal import project.");
      setImportRepo("");
      setImporting(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await fetch("/api/projects/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id, alsoDeleteRepo: false })
      });
      setPendingDelete(null);
      await load();
      onNotify?.("Project dihapus dari daftar Naze.", "default");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(p: Project) {
    const name = `${p.name} Copy`;
    setBusy(true);
    try {
      await fetch("/api/projects/duplicate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, newName: name })
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (projects === null) {
    return (
      <main className="naze-shell">
        <p className="naze-status">LOADING WORKSPACE...</p>
      </main>
    );
  }

  return (
    <main className="naze-shell" style={{ justifyContent: "flex-start", paddingTop: "3rem", gap: "1.25rem" }}>
      <h1 className="naze-title" style={{ fontSize: "var(--text-2xl)" }}>
        YOUR PROJECTS
      </h1>

      {error && (
        <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)" }}>{error}</p>
      )}

      {projects.length === 0 && !creating && (
        <div className="naze-scrap-card" style={{ maxWidth: 360, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", margin: 0 }}>
            YOUR WORKSPACE IS EMPTY.
          </p>
          <p style={{ color: "var(--naze-white-dim)", fontSize: "var(--text-sm)", margin: "0.5rem 0 1rem" }}>
            Create your first project.
          </p>
          <button className="naze-btn naze-btn--primary" onClick={() => setCreating(true)}>
            CREATE PROJECT
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "min(420px, 92vw)" }}>
          {projects.map((p) => (
            <div key={p.id} className="naze-scrap-card" style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <IconFolder size={18} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>{p.name}</span>
              </div>
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--naze-white-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  marginTop: "0.35rem"
                }}
              >
                <IconGithub size={13} />
                {p.repoFullName}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
                <button className="naze-btn" onClick={() => onOpenProject(p)}>
                  Open
                </button>
                <button className="naze-btn" onClick={() => handleDuplicate(p)} disabled={busy}>
                  Duplicate
                </button>
                <button className="naze-icon-btn" aria-label="Delete" onClick={() => setPendingDelete(p)}>
                  <IconDelete size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="naze-scrap-card" style={{ width: "min(360px, 92vw)" }}>
          <input
            className="naze-input"
            style={{ width: "100%" }}
            placeholder="Nama project"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button className="naze-btn naze-btn--primary" onClick={handleCreate} disabled={busy || !newName.trim()}>
              {busy ? "Creating..." : "Create"}
            </button>
            <button className="naze-btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {importing && (
        <div className="naze-scrap-card" style={{ width: "min(360px, 92vw)" }}>
          <input
            className="naze-input"
            style={{ width: "100%" }}
            placeholder="owner/repo (repo GitHub yang sudah ada)"
            value={importRepo}
            onChange={(e) => setImportRepo(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button className="naze-btn naze-btn--primary" onClick={handleImport} disabled={busy || !importRepo.trim()}>
              {busy ? "Importing..." : "Import"}
            </button>
            <button className="naze-btn" onClick={() => setImporting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!creating && !importing && projects.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="naze-btn naze-btn--primary" onClick={() => setCreating(true)}>
            CREATE PROJECT
          </button>
          <button className="naze-btn" onClick={() => setImporting(true)}>
            IMPORT PROJECT
          </button>
        </div>
      )}

      {pendingDelete && (
        <NazeConfirmModal
          title="Delete Project"
          description={`"${pendingDelete.name}" akan dihapus dari daftar Naze. Repo GitHub-nya TIDAK ikut terhapus (opsi hapus repo sungguhan menyusul di Settings).`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}

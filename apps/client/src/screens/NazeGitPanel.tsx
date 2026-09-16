import { useEffect, useState } from "react";
import { IconGit, IconChevron, IconCheck } from "../../../../packages/design-system/icons";

/**
 * GIT INTEGRATION — Phase 12.
 * "Status" di sini = commit history + file yang berubah per commit (karena
 * tidak ada working directory lokal — lihat catatan di github/git.ts).
 * Branch switching mengubah branch kerja Naze, bukan default branch repo.
 */

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

interface Branch {
  name: string;
  protected: boolean;
}

interface Props {
  repoFullName: string;
  branch: string;
  onBranchSwitched: (branch: string) => void;
}

function DiffPatch({ patch }: { patch: string | null }) {
  if (!patch) return <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-white-faint)" }}>Binary atau file besar — tidak ada patch text.</p>;
  return (
    <pre
      style={{
        background: "var(--naze-black)",
        padding: "0.5rem",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        overflowX: "auto",
        margin: 0
      }}
    >
      {patch.split("\n").map((line, i) => (
        <div
          key={i}
          style={{
            color: line.startsWith("+") ? "var(--naze-blue)" : line.startsWith("-") ? "var(--naze-pink)" : "var(--naze-white-dim)"
          }}
        >
          {line}
        </div>
      ))}
    </pre>
  );
}

export default function NazeGitPanel({ repoFullName, branch, onBranchSwitched }: Props) {
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [expandedSha, setExpandedSha] = useState<string | null>(null);
  const [diffFiles, setDiffFiles] = useState<DiffFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadCommits() {
    try {
      const res = await fetch("/api/git/commits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCommits(data);
    } catch (err) {
      setError((err as Error).message);
      setCommits([]);
    }
  }

  async function loadBranches() {
    try {
      const res = await fetch("/api/git/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBranches(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    setCommits(null);
    loadCommits();
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoFullName, branch]);

  async function toggleDiff(sha: string) {
    if (expandedSha === sha) {
      setExpandedSha(null);
      return;
    }
    setExpandedSha(sha);
    setDiffFiles(null);
    try {
      const res = await fetch("/api/git/diff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, sha })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiffFiles(data.files);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateBranch() {
    if (!newBranchName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/git/create-branch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, newBranch: newBranchName.trim(), fromBranch: branch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewBranchName("");
      setCreatingBranch(false);
      await loadBranches();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchBranch(name: string) {
    onBranchSwitched(name);
  }

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      {error && <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)" }}>{error}</p>}

      {/* Branch selector */}
      <div className="naze-scrap-card" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
          <IconGit size={15} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>Branches</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {branches?.map((b) => (
            <button
              key={b.name}
              className="naze-tab"
              data-active={b.name === branch}
              onClick={() => handleSwitchBranch(b.name)}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {b.name}
            </button>
          ))}
        </div>

        {!creatingBranch ? (
          <button className="naze-btn" style={{ marginTop: "0.6rem" }} onClick={() => setCreatingBranch(true)}>
            + New Branch
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
            <input
              className="naze-input"
              style={{ flex: 1 }}
              placeholder={`dari ${branch}`}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              autoFocus
            />
            <button className="naze-btn naze-btn--primary" onClick={handleCreateBranch} disabled={busy || !newBranchName.trim()}>
              Create
            </button>
            <button className="naze-btn" onClick={() => setCreatingBranch(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Commit history */}
      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", marginBottom: "0.5rem" }}>
        Commit History — {branch}
      </div>

      {commits === null ? (
        <p className="naze-status">LOADING COMMITS...</p>
      ) : commits.length === 0 ? (
        <p style={{ color: "var(--naze-white-faint)", fontSize: "var(--text-sm)" }}>Belum ada commit di branch ini.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {commits.map((c) => (
            <div key={c.sha}>
              <button
                className="naze-scrap-card"
                style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none" }}
                onClick={() => toggleDiff(c.sha)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>{c.message.split("\n")[0]}</p>
                    <p style={{ margin: "0.2rem 0 0", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-faint)" }}>
                      {c.author} · {new Date(c.date).toLocaleString("id-ID")} · {c.sha.slice(0, 7)}
                    </p>
                  </div>
                  <span style={{ transform: expandedSha === c.sha ? "rotate(90deg)" : "none" }}>
                    <IconChevron size={13} />
                  </span>
                </div>
              </button>

              {expandedSha === c.sha && (
                <div style={{ paddingLeft: "0.5rem", marginTop: "0.3rem" }}>
                  {diffFiles === null ? (
                    <p className="naze-status">LOADING DIFF...</p>
                  ) : (
                    diffFiles.map((f) => (
                      <div key={f.filename} style={{ marginBottom: "0.5rem" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <IconCheck size={11} />
                          {f.filename}
                          <span style={{ color: "var(--naze-white-faint)" }}>
                            (+{f.additions}/-{f.deletions})
                          </span>
                        </p>
                        <DiffPatch patch={f.patch} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

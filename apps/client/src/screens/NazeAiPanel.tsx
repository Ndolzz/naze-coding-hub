import { useState } from "react";
import { diffLines } from "diff";
import { IconClaude, IconWarning, IconCheck, IconError } from "../../../../packages/design-system/icons";
import NazeConfirmModal from "../components/NazeConfirmModal";
import { matchSimpleTask, type SimpleTaskKind } from "../lib/simpleTasks";

/**
 * NAZE AI PANEL — Phase 14-18 digabung di sini:
 * - Phase 19 (simple task optimization): pola perintah sederhana
 *   dieksekusi LANGSUNG tanpa panggil AI sama sekali.
 * - Phase 14/15: Analyze (Claude/Gemini) -> Naze Plan -> Implement (Gemini).
 * - Phase 16 (orchestrator): dry-run dulu sebelum commit sungguhan.
 * - Phase 17 (permission): delete selalu minta konfirmasi modal terpisah.
 * - Phase 18 (diff/rollback): preview diff nyata (pakai lib `diff`)
 *   sebelum commit, dan "Undo AI Change" setelah commit.
 */

interface PlanItem {
  action: "create" | "modify" | "delete";
  path: string;
  reason: string;
}

interface AnalyzeResult {
  analysis: string;
  plan: PlanItem[];
  provider: "claude" | "gemini";
}

interface PreviewItem {
  path: string;
  action: PlanItem["action"];
  status: "success" | "failed" | "preview";
  error?: string;
  oldContent?: string | null;
  newContent?: string | null;
}

interface Props {
  repoFullName: string;
  branch: string;
  openFilePath: string | null;
  prefill?: { request: string; buildLogs?: string } | null;
  onNotify?: (text: string, tone?: "default" | "success" | "error") => void;
}

const actionColor: Record<PlanItem["action"], string> = {
  create: "var(--naze-blue)",
  modify: "var(--naze-purple)",
  delete: "var(--naze-pink)"
};

// Phase 19 — eksekutor per jenis simple task (deteksinya di lib/simpleTasks.ts, sudah di-unit-test terpisah).
async function runSimpleTask(kind: SimpleTaskKind, groups: string[], ctx: { repoFullName: string; branch: string }): Promise<string> {
  if (kind === "delete_file") {
    const path = groups[0];
    await fetch("/api/files/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoFullName: ctx.repoFullName, branch: ctx.branch, path, type: "file" })
    });
    return `File "${path}" dihapus.`;
  }
  if (kind === "create_folder") {
    const path = groups[0];
    await fetch("/api/files/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoFullName: ctx.repoFullName, branch: ctx.branch, path, type: "folder" })
    });
    return `Folder "${path}" dibuat.`;
  }
  // rename
  const [oldPath, newPath] = groups;
  await fetch("/api/files/rename", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repoFullName: ctx.repoFullName, branch: ctx.branch, oldPath, newPath, type: "file" })
  });
  return `"${oldPath}" di-rename jadi "${newPath}".`;
}

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const parts = diffLines(oldContent, newContent);
  return (
    <pre
      style={{
        background: "var(--naze-black)",
        padding: "0.5rem",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        overflowX: "auto",
        margin: "0.3rem 0",
        maxHeight: 220,
        overflowY: "auto"
      }}
    >
      {parts.map((part, i) => (
        <div key={i} style={{ color: part.added ? "var(--naze-blue)" : part.removed ? "var(--naze-pink)" : "var(--naze-white-faint)" }}>
          {part.value
            .split("\n")
            .filter((_, idx, arr) => !(idx === arr.length - 1 && arr[idx] === ""))
            .map((line, j) => (
              <div key={j}>
                {part.added ? "+ " : part.removed ? "- " : "  "}
                {line}
              </div>
            ))}
        </div>
      ))}
    </pre>
  );
}

export default function NazeAiPanel({ repoFullName, branch, openFilePath, prefill, onNotify }: Props) {
  const [request, setRequest] = useState(prefill?.request ?? "");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simpleTaskMessage, setSimpleTaskMessage] = useState<string | null>(null);

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<PreviewItem[] | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackDone, setRollbackDone] = useState(false);

  function resetForNewRequest() {
    setResult(null);
    setPreview(null);
    setCommitted(null);
    setRollbackDone(false);
    setSimpleTaskMessage(null);
    setError(null);
  }

  async function analyze() {
    if (!request.trim()) return;
    resetForNewRequest();

    // Phase 19: coba cocokkan simple task dulu — kalau match, jangan panggil AI sama sekali.
    const simpleMatch = matchSimpleTask(request);
    if (simpleMatch) {
      setLoading(true);
      try {
        const msg = await runSimpleTask(simpleMatch.kind, simpleMatch.groups, { repoFullName, branch });
        setSimpleTaskMessage(`${msg} (simple task — dieksekusi langsung, tanpa AI)`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setStage("Membaca struktur project...");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repoFullName,
          branch,
          userRequest: request,
          openFilePath: openFilePath ?? undefined,
          buildLogs: prefill?.buildLogs
        })
      });
      setStage("Menganalisis...");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menganalisis.");
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setStage(null);
    }
  }

  async function runPreview() {
    if (!result || result.plan.length === 0) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/implement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, userRequest: request, plan: result.plan, dryRun: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat preview.");
      setPreview(data.results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  }

  function requestCommit() {
    const hasDelete = preview?.some((p) => p.action === "delete");
    if (hasDelete) {
      setPendingDeleteConfirm(true);
      return;
    }
    commit();
  }

  async function commit() {
    if (!preview) return;
    setPendingDeleteConfirm(false);
    setCommitting(true);
    setError(null);
    try {
      const preGenerated = preview.map((p) => ({ path: p.path, content: p.newContent ?? null }));
      const res = await fetch("/api/ai/implement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repoFullName,
          branch,
          userRequest: request,
          plan: result!.plan,
          dryRun: false,
          preGenerated
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal implementasi.");
      setCommitted(data.results);
      setPreview(null);
      const failCount = (data.results as PreviewItem[]).filter((r) => r.status === "failed").length;
      onNotify?.(
        failCount > 0 ? `Implementasi selesai, ${failCount} file gagal.` : "Perubahan berhasil di-commit.",
        failCount > 0 ? "error" : "success"
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCommitting(false);
    }
  }

  async function undo() {
    if (!committed) return;
    setRollingBack(true);
    try {
      const items = committed
        .filter((c) => c.status === "success")
        .map((c) => ({ path: c.path, action: c.action, oldContent: c.oldContent ?? null }));
      await fetch("/api/ai/rollback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, items })
      });
      setRollbackDone(true);
      onNotify?.("Perubahan di-restore ke versi sebelumnya.", "default");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRollingBack(false);
    }
  }

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
        <IconClaude size={16} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>Naze AI</span>
      </div>

      <textarea
        className="naze-input"
        style={{ width: "100%", minHeight: 70, fontFamily: "var(--font-ui)", resize: "vertical" }}
        placeholder='Coba: "Jelaskan struktur project ini", "Kenapa build gagal?", atau "hapus file foo.ts"'
        value={request}
        onChange={(e) => setRequest(e.target.value)}
      />
      <button className="naze-btn naze-btn--primary" style={{ marginTop: "0.5rem" }} onClick={analyze} disabled={loading || !request.trim()}>
        {loading ? stage ?? "Memproses..." : "Analyze"}
      </button>

      {error && (
        <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)", marginTop: "0.6rem", display: "flex", gap: "0.3rem", alignItems: "center" }}>
          <IconWarning size={13} /> {error}
        </p>
      )}

      {simpleTaskMessage && (
        <p style={{ color: "var(--naze-blue)", fontSize: "var(--text-sm)", marginTop: "0.6rem" }}>{simpleTaskMessage}</p>
      )}

      {result && (
        <div className="naze-scrap-card" style={{ marginTop: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-faint)", margin: 0 }}>
            via {result.provider === "gemini" ? "Gemini (mode hemat biaya)" : "Claude"}
          </p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--naze-white-dim)", whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>{result.analysis}</p>

          {result.plan.length > 0 && !preview && !committed && (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-faint)", marginTop: "0.75rem" }}>
                PROPOSED CHANGES
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.3rem" }}>
                {result.plan.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.4rem", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: actionColor[item.action], textTransform: "uppercase", minWidth: 52 }}>{item.action}</span>
                    <span style={{ flex: 1 }}>
                      {item.path}
                      <span style={{ display: "block", color: "var(--naze-white-faint)" }}>{item.reason}</span>
                    </span>
                  </div>
                ))}
              </div>
              <button className="naze-btn naze-btn--primary" style={{ marginTop: "0.75rem" }} onClick={runPreview} disabled={previewLoading}>
                {previewLoading ? "Menyiapkan preview..." : "Preview Changes"}
              </button>
            </>
          )}

          {preview && (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-white-faint)", marginTop: "0.75rem" }}>
                DIFF PREVIEW
              </p>
              {preview.map((p) => (
                <div key={p.path} style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ color: actionColor[p.action], textTransform: "uppercase" }}>{p.action}</span> {p.path}
                  </p>
                  {p.action === "delete" ? (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-pink)" }}>File ini akan dihapus.</p>
                  ) : (
                    <DiffView oldContent={p.oldContent ?? ""} newContent={p.newContent ?? ""} />
                  )}
                </div>
              ))}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button className="naze-btn naze-btn--primary" onClick={requestCommit} disabled={committing}>
                  {committing ? "Committing..." : "Confirm & Commit"}
                </button>
                <button className="naze-btn" onClick={() => setPreview(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {committed && (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {committed.map((r) => (
                <p key={r.path} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", margin: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ color: r.status === "success" ? "var(--naze-blue)" : "var(--naze-pink)", display: "inline-flex" }}>
                    {r.status === "success" ? <IconCheck size={12} /> : <IconError size={12} />}
                  </span>
                  {r.path}
                  {r.error && <span style={{ color: "var(--naze-white-faint)" }}> — {r.error}</span>}
                </p>
              ))}
              <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-white-faint)", marginTop: "0.4rem" }}>
                Validasi berjalan otomatis lewat GitHub Actions tiap commit — cek tab Build.
              </p>

              {!rollbackDone ? (
                <button className="naze-btn" style={{ marginTop: "0.4rem", alignSelf: "flex-start" }} onClick={undo} disabled={rollingBack}>
                  {rollingBack ? "Membatalkan..." : "Undo AI Change"}
                </button>
              ) : (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-blue)" }}>Perubahan sudah di-restore ke versi sebelumnya.</p>
              )}
            </div>
          )}
        </div>
      )}

      {pendingDeleteConfirm && (
        <NazeConfirmModal
          title="Confirm Delete"
          description="Plan ini termasuk menghapus file. Tindakan ini akan commit sungguhan ke GitHub — pastikan sudah dicek di preview."
          confirmLabel="Commit Anyway"
          onConfirm={commit}
          onCancel={() => setPendingDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

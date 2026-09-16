import { useEffect, useState } from "react";
import { IconRefresh, IconCheck, IconError, IconWarning, IconChevron } from "../../../../packages/design-system/icons";
import NazeTooltip from "../components/NazeTooltip";

/**
 * BUILD & LOGS VIEWER — Phase 11 (pengganti "Terminal" tradisional,
 * sesuai keputusan arsitektur full-Vercel: tidak ada shell interaktif,
 * semua eksekusi command lewat GitHub Actions — lihat ARCHITECTURE.md §6).
 * Setiap commit dari File Explorer/Editor otomatis men-trigger run baru
 * di sini lewat `on: push` di build.yml.
 */

interface RunSummary {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  display_title: string;
  created_at: string;
}

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  steps: JobStep[];
}

function StatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status !== "completed") return <IconWarning size={14} />;
  if (conclusion === "success") return <IconCheck size={14} />;
  return <IconError size={14} />;
}

function statusColor(status: string, conclusion: string | null) {
  if (status !== "completed") return "var(--naze-blue)";
  return conclusion === "success" ? "var(--naze-blue)" : "var(--naze-pink)";
}

interface Props {
  repoFullName: string;
  onAskAi: (buildLogs: string) => void;
}

export default function NazeBuildLogs({ repoFullName, onAskAi }: Props) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunSummary | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [openLogJobId, setOpenLogJobId] = useState<number | null>(null);
  const [logText, setLogText] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function loadRuns() {
    setError(null);
    try {
      const res = await fetch("/api/actions/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRuns(data);
    } catch (err) {
      setError((err as Error).message);
      setRuns([]);
    }
  }

  useEffect(() => {
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoFullName]);

  async function openRun(run: RunSummary) {
    setSelectedRun(run);
    setJobs(null);
    setOpenLogJobId(null);
    setLogText(null);
    try {
      const res = await fetch("/api/actions/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, runId: run.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobs(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function viewLogs(jobId: number) {
    if (openLogJobId === jobId) {
      setOpenLogJobId(null);
      return;
    }
    setOpenLogJobId(jobId);
    setLoadingLogs(true);
    setLogText(null);
    try {
      const res = await fetch("/api/actions/logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, jobId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogText(data.logs);
    } catch (err) {
      setLogText(`Gagal memuat log: ${(err as Error).message}`);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function askNazeAi() {
    onAskAi(logText ?? "");
  }

  if (runs === null) return <p className="naze-status">LOADING BUILDS...</p>;

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>Build & Logs</span>
        <NazeTooltip label="Refresh">
          <button className="naze-icon-btn" aria-label="Refresh" onClick={loadRuns}>
            <IconRefresh size={15} />
          </button>
        </NazeTooltip>
      </div>

      {error && <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)" }}>{error}</p>}

      {runs.length === 0 && (
        <p style={{ color: "var(--naze-white-faint)", fontSize: "var(--text-sm)" }}>
          Belum ada build. Build otomatis jalan tiap kali ada commit baru (mis. dari File Explorer/Editor).
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {runs.map((run) => (
          <div key={run.id}>
            <button
              className="naze-scrap-card"
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                border: "none"
              }}
              onClick={() => openRun(run)}
            >
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                  {run.display_title}
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--naze-white-faint)" }}>
                  {new Date(run.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <span style={{ color: statusColor(run.status, run.conclusion), display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <StatusIcon status={run.status} conclusion={run.conclusion} />
                {run.status === "completed" ? run.conclusion?.toUpperCase() : "RUNNING"}
              </span>
            </button>

            {selectedRun?.id === run.id && jobs && (
              <div style={{ paddingLeft: "0.75rem", marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {jobs.map((job) => (
                  <div key={job.id}>
                    <button
                      className="naze-btn"
                      style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onClick={() => viewLogs(job.id)}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ transform: openLogJobId === job.id ? "rotate(90deg)" : "none" }}>
                          <IconChevron size={12} />
                        </span>
                        {job.name}
                      </span>
                      <span style={{ color: statusColor(job.status, job.conclusion) }}>
                        <StatusIcon status={job.status} conclusion={job.conclusion} />
                      </span>
                    </button>

                    {openLogJobId === job.id && (
                      <div
                        style={{
                          background: "var(--naze-black)",
                          border: "1px solid var(--naze-black-line)",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.6rem",
                          marginTop: "0.3rem",
                          maxHeight: 260,
                          overflowY: "auto",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          whiteSpace: "pre-wrap",
                          color: "var(--naze-white-dim)"
                        }}
                      >
                        {loadingLogs ? "Memuat log..." : logText}
                      </div>
                    )}

                    {openLogJobId === job.id && job.conclusion === "failure" && (
                      <button className="naze-btn naze-btn--primary" style={{ marginTop: "0.4rem" }} onClick={askNazeAi}>
                        ASK NAZE AI
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

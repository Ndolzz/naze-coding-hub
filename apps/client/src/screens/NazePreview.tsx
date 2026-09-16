import { useEffect, useState } from "react";
import { IconRefresh, IconCheck, IconError, IconWarning } from "../../../../packages/design-system/icons";

/**
 * PREVIEW — Phase 13.
 * Kejujuran arsitektur: tanpa build step, tidak ada cara nyata nampilin
 * preview project (apalagi yang butuh bundler seperti React/Vite) dari
 * dalam browser saja. Jadi Preview di sini = deployment Vercel sungguhan,
 * bukan simulasi. Kalau belum di-link, kita bilang terus terang & kasih
 * cara hubungkannya — bukan render iframe kosong yang pura-pura preview.
 */

interface PreviewStatus {
  linked: boolean;
  hasDeployment?: boolean;
  state?: string;
  url?: string;
  error?: string;
}

interface Props {
  projectId: string;
  vercelProjectId?: string;
  onLinked: (vercelProjectId: string) => void;
}

function StateBadge({ state }: { state?: string }) {
  if (!state) return null;
  const color = state === "READY" ? "var(--naze-blue)" : state === "ERROR" ? "var(--naze-pink)" : "var(--naze-white-dim)";
  const Icon = state === "READY" ? IconCheck : state === "ERROR" ? IconError : IconWarning;
  return (
    <span style={{ color, display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
      <Icon size={13} />
      {state}
    </span>
  );
}

export default function NazePreview({ projectId, vercelProjectId, onLinked }: Props) {
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [linking, setLinking] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/preview/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vercelProjectId })
    }).catch(() => null);
    if (res?.ok) setStatus(await res.json());
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelProjectId]);

  async function handleLink() {
    if (!linkInput.trim()) return;
    setLinking(true);
    try {
      const res = await fetch("/api/projects/link-vercel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: projectId, vercelProjectId: linkInput.trim() })
      });
      const data = await res.json();
      if (res.ok) onLinked(data.vercelProjectId);
    } finally {
      setLinking(false);
    }
  }

  if (!vercelProjectId) {
    return (
      <div className="naze-scrap-card" style={{ width: "min(420px, 94vw)" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", margin: 0 }}>
          Preview belum terhubung
        </p>
        <p style={{ color: "var(--naze-white-dim)", fontSize: "var(--text-sm)", margin: "0.5rem 0 1rem" }}>
          Naze tidak bisa render preview tanpa build sungguhan (apalagi project yang butuh bundler).
          Hubungkan repo ini ke sebuah Vercel Project supaya Preview menampilkan deployment asli.
        </p>
        <input
          className="naze-input"
          style={{ width: "100%" }}
          placeholder="Vercel Project ID"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
        />
        <button className="naze-btn naze-btn--primary" style={{ marginTop: "0.6rem" }} onClick={handleLink} disabled={linking || !linkInput.trim()}>
          {linking ? "Menghubungkan..." : "Link to Vercel"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <StateBadge state={status?.state} />
        <button className="naze-icon-btn" aria-label="Refresh" onClick={loadStatus}>
          <IconRefresh size={15} />
        </button>
      </div>

      {status?.error && <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-sm)" }}>{status.error}</p>}

      {status?.hasDeployment === false && (
        <p style={{ color: "var(--naze-white-faint)", fontSize: "var(--text-sm)" }}>
          Belum ada deployment untuk project Vercel ini.
        </p>
      )}

      {status?.state === "READY" && status.url && (
        <div style={{ border: "1px solid var(--naze-black-line)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <iframe src={status.url} title="Naze Preview" style={{ width: "100%", height: 420, border: "none", background: "white" }} />
        </div>
      )}

      {status?.state && status.state !== "READY" && (
        <p style={{ color: "var(--naze-white-dim)", fontSize: "var(--text-sm)" }}>
          Deployment sedang {status.state.toLowerCase()}. Preview muncul begitu status READY.
        </p>
      )}

      {status?.url && (
        <a href={status.url} target="_blank" rel="noreferrer">
          <button className="naze-btn" style={{ marginTop: "0.5rem" }}>
            Open in new tab
          </button>
        </a>
      )}
    </div>
  );
}

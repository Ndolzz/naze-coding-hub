import { useEffect, useState } from "react";
import { IconCheck, IconWarning, IconClaude, IconGemini } from "../../../../packages/design-system/icons";

/**
 * CONNECT YOUR AI — Phase 5, dengan validasi nyata Phase 6/7.
 *
 * Alur per provider: SAVE (dev-only, lihat catatan di configure.ts)
 * → CHECKING (call /api/ai/validate, request sungguhan ke provider)
 * → CONNECTED / INVALID. Continue hanya aktif setelah KEDUA provider
 * benar-benar tervalidasi — bukan cuma "field terisi".
 */

interface SystemStatus {
  claudeConfigured: boolean;
  geminiConfigured: boolean;
}

type ValidationState = "idle" | "checking" | "valid" | "invalid";

interface ProviderSetupProps {
  providerLabel: string;
  icon: React.ReactNode;
  configured: boolean;
  validation: ValidationState;
  validationMessage: string | null;
  docUrl: string;
  docLabel: string;
  steps: string[];
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onTest: () => void;
  onReset: () => void;
  saving: boolean;
  message: string | null;
  readOnlyProd: boolean;
}

function statusLabel(v: ValidationState, configured: boolean) {
  if (v === "checking") return "CHECKING...";
  if (v === "valid") return "CONNECTED";
  if (v === "invalid") return "INVALID";
  return configured ? "CONFIGURED (belum ditest)" : "NOT CONNECTED";
}

function ProviderSetup(p: ProviderSetupProps) {
  const label = statusLabel(p.validation, p.configured);
  const color =
    p.validation === "valid"
      ? "var(--naze-blue)"
      : p.validation === "invalid"
      ? "var(--naze-pink)"
      : "var(--naze-white-faint)";

  return (
    <div className="naze-scrap-card" style={{ textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {p.icon}
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>
            {p.providerLabel}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color
          }}
        >
          {p.validation === "valid" ? <IconCheck size={14} /> : <IconWarning size={14} />}
          {label}
        </span>
      </div>

      <ol style={{ margin: "0.75rem 0", paddingLeft: "1.1rem", color: "var(--naze-white-dim)", fontSize: "var(--text-sm)" }}>
        {p.steps.map((s, i) => (
          <li key={i} style={{ marginBottom: "0.25rem" }}>
            {s}
          </li>
        ))}
      </ol>

      <a href={p.docUrl} target="_blank" rel="noreferrer">
        <button className="naze-btn" style={{ marginBottom: "0.75rem" }}>
          {p.docLabel}
        </button>
      </a>

      {!p.readOnlyProd && (
        <>
          <input
            className="naze-input"
            type="password"
            placeholder={`Masukkan ${p.providerLabel} API key`}
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <button className="naze-btn" onClick={p.onSave} disabled={p.saving || !p.value}>
              {p.saving ? "Menyimpan..." : "Save"}
            </button>
            <button className="naze-btn" onClick={p.onReset}>
              Reset
            </button>
          </div>
        </>
      )}

      {p.readOnlyProd && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-white-faint)" }}>
          Production berjalan di Vercel — key wajib di-set lewat Vercel Project Settings →
          Environment Variables, bukan dari sini.
        </p>
      )}

      <button
        className="naze-btn naze-btn--primary"
        style={{ marginTop: "0.75rem" }}
        onClick={p.onTest}
        disabled={p.validation === "checking"}
      >
        {p.validation === "checking" ? "Testing..." : p.validation === "invalid" ? "Retry" : "Test Connection"}
      </button>

      {(p.message || p.validationMessage) && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--naze-white-dim)", marginTop: "0.5rem" }}>
          {p.validationMessage ?? p.message}
        </p>
      )}
    </div>
  );
}

export default function NazeApiSetup({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<SystemStatus>({ claudeConfigured: false, geminiConfigured: false });
  const [readOnlyProd, setReadOnlyProd] = useState(false);
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [savingClaude, setSavingClaude] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [claudeMsg, setClaudeMsg] = useState<string | null>(null);
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null);
  const [claudeValidation, setClaudeValidation] = useState<ValidationState>("idle");
  const [geminiValidation, setGeminiValidation] = useState<ValidationState>("idle");
  const [claudeValidationMsg, setClaudeValidationMsg] = useState<string | null>(null);
  const [geminiValidationMsg, setGeminiValidationMsg] = useState<string | null>(null);

  async function refreshStatus() {
    const res = await fetch("/api/system/status").catch(() => null);
    if (res?.ok) setStatus(await res.json());
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function save(kind: "claude" | "gemini") {
    const setSaving = kind === "claude" ? setSavingClaude : setSavingGemini;
    const setMsg = kind === "claude" ? setClaudeMsg : setGeminiMsg;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/system/configure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "claude" ? { claudeApiKey: claudeKey } : { geminiApiKey: geminiKey })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.reason === "read_only_environment") setReadOnlyProd(true);
        setMsg(data.message);
      } else {
        setMsg(data.message);
        await refreshStatus();
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reset(kind: "claude" | "gemini") {
    const setMsg = kind === "claude" ? setClaudeMsg : setGeminiMsg;
    const setValidation = kind === "claude" ? setClaudeValidation : setGeminiValidation;
    const res = await fetch("/api/system/configure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reset: kind })
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setMsg(data.message);
      setValidation("idle");
      if (kind === "claude") setClaudeKey("");
      else setGeminiKey("");
      await refreshStatus();
    }
  }

  async function test(kind: "claude" | "gemini") {
    const setValidation = kind === "claude" ? setClaudeValidation : setGeminiValidation;
    const setValidationMsg = kind === "claude" ? setClaudeValidationMsg : setGeminiValidationMsg;
    setValidation("checking");
    setValidationMsg(null);
    try {
      const res = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: kind })
      });
      const data = await res.json();
      setValidation(data.valid ? "valid" : "invalid");
      setValidationMsg(data.message);
    } catch (err) {
      setValidation("invalid");
      setValidationMsg((err as Error).message);
    }
  }

  const systemReady = claudeValidation === "valid" && geminiValidation === "valid";

  return (
    <main className="naze-shell" style={{ justifyContent: "flex-start", paddingTop: "3rem", gap: "1.25rem" }}>
      <h1 className="naze-title" style={{ fontSize: "var(--text-2xl)" }}>
        CONNECT YOUR AI
      </h1>
      <p className="naze-tagline">Claude menganalisis. Gemini mengimplementasi.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "min(420px, 92vw)", marginTop: "1rem" }}>
        <ProviderSetup
          providerLabel="Claude"
          icon={<IconClaude size={20} />}
          configured={status.claudeConfigured}
          validation={claudeValidation}
          validationMessage={claudeValidationMsg}
          docUrl="https://console.anthropic.com/"
          docLabel="OPEN CLAUDE"
          steps={[
            "Buka platform resmi Anthropic.",
            "Login / buat akun.",
            "Masuk ke bagian API.",
            "Buat API key.",
            "Copy key.",
            "Masukkan ke Naze."
          ]}
          value={claudeKey}
          onChange={setClaudeKey}
          onSave={() => save("claude")}
          onTest={() => test("claude")}
          onReset={() => reset("claude")}
          saving={savingClaude}
          message={claudeMsg}
          readOnlyProd={readOnlyProd}
        />

        <ProviderSetup
          providerLabel="Gemini"
          icon={<IconGemini size={20} />}
          configured={status.geminiConfigured}
          validation={geminiValidation}
          validationMessage={geminiValidationMsg}
          docUrl="https://aistudio.google.com/"
          docLabel="OPEN GEMINI"
          steps={["Buka Google AI Studio.", "Login.", "Buat API key.", "Copy key.", "Masukkan ke Naze."]}
          value={geminiKey}
          onChange={setGeminiKey}
          onSave={() => save("gemini")}
          onTest={() => test("gemini")}
          onReset={() => reset("gemini")}
          saving={savingGemini}
          message={geminiMsg}
          readOnlyProd={readOnlyProd}
        />

        {readOnlyProd && (
          <button className="naze-btn" onClick={refreshStatus}>
            Sudah di-set di Vercel — Recheck
          </button>
        )}

        {systemReady && (
          <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--naze-blue)" }}>
            SYSTEM READY
          </p>
        )}

        <button className="naze-btn naze-btn--primary" disabled={!systemReady} onClick={onComplete}>
          {systemReady ? "Continue" : "Test kedua koneksi untuk lanjut"}
        </button>
      </div>
    </main>
  );
}

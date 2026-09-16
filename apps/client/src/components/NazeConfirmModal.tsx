import { IconWarning } from "../../../../packages/design-system/icons";

/**
 * Modal konfirmasi custom Naze — WAJIB dipakai untuk semua operasi
 * destruktif (delete/overwrite/replace), bukan browser confirm() default
 * (spec §22).
 */
interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function NazeConfirmModal({ title, description, confirmLabel = "Delete", onConfirm, onCancel }: Props) {
  return (
    <div className="naze-modal-backdrop" role="dialog" aria-modal="true">
      <div className="naze-scrap-card naze-modal-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--naze-pink)" }}>
          <IconWarning size={20} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>{title}</span>
        </div>
        <p style={{ color: "var(--naze-white-dim)", fontSize: "var(--text-sm)", marginTop: "0.75rem" }}>
          {description}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
          <button className="naze-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="naze-btn naze-btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

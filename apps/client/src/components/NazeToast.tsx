import { useEffect, useState } from "react";

/**
 * NOTIFICATIONS — Phase 21. Toast singkat di bawah layar, auto-dismiss.
 * Dipakai App.tsx sebagai satu stack global (bukan per-komponen) supaya
 * notifikasi dari panel manapun konsisten posisi & animasinya.
 */

export interface ToastMessage {
  id: string;
  text: string;
  tone?: "default" | "success" | "error";
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 3200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onDismiss(toast.id), 220);
    return () => clearTimeout(timer);
  }, [leaving, onDismiss, toast.id]);

  const color = toast.tone === "success" ? "var(--naze-blue)" : toast.tone === "error" ? "var(--naze-pink)" : "var(--naze-white)";

  return (
    <div className="naze-toast" data-leaving={leaving} style={{ color }}>
      {toast.text}
    </div>
  );
}

export default function NazeToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="naze-toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * TOOLTIP — Phase 21. Pure CSS (hover/focus-triggered), dipakai membungkus
 * icon-only button supaya fungsinya jelas tanpa nambah teks di UI kecil.
 */
export default function NazeTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="naze-tooltip-wrap" tabIndex={-1}>
      {children}
      <span className="naze-tooltip-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}

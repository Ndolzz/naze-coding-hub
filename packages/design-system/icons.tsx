/**
 * NAZE ICON SYSTEM — Phase 3
 * Semua icon SVG line-style (stroke 1.75, rounded cap/join), konsisten
 * dengan bahasa desain "futuristic/software". TIDAK ADA emoji di project
 * ini (spec §44) — setiap penanda visual baru wajib ditambahkan ke sini
 * mengikuti pola yang sama, bukan ditulis inline di komponen.
 *
 * Set ini baru mencakup subset paling sering dipakai di workspace (Phase 7-13).
 * Icon lain di daftar spec §45 (branch, commit, upload, dst.) ditambahkan
 * mengikuti struktur NazeIcon yang sama saat komponennya mulai dibangun.
 */
import type { SVGProps } from "react";

interface NazeIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function NazeIcon({ size = 20, children, ...props }: NazeIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconFolder = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M3 6a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
  </NazeIcon>
);

export const IconFile = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
  </NazeIcon>
);

export const IconCode = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M9 8 4.5 12 9 16" />
    <path d="M15 8l4.5 4-4.5 4" />
  </NazeIcon>
);

export const IconSearch = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.35-4.35" />
  </NazeIcon>
);

export const IconTerminal = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="M7 10l3 2-3 2" />
    <path d="M13 14h4" />
  </NazeIcon>
);

export const IconSettings = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.7-1.4-1.5-2.6-2.1.6a7.4 7.4 0 0 0-2.6-1.5L14.5 3h-3l-.4 2.6a7.4 7.4 0 0 0-2.6 1.5l-2.1-.6-1.5 2.6 1.7 1.4a7.5 7.5 0 0 0 0 3l-1.7 1.4 1.5 2.6 2.1-.6c.77.66 1.65 1.17 2.6 1.5l.4 2.6h3l.4-2.6c.95-.33 1.83-.84 2.6-1.5l2.1.6 1.5-2.6-1.7-1.4Z" />
  </NazeIcon>
);

export const IconGit = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <circle cx="7" cy="6" r="2" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="12" r="2" />
    <path d="M7 8v8" />
    <path d="M9 6h4a4 4 0 0 1 4 4v0" />
  </NazeIcon>
);

export const IconGithub = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M12 3a9 9 0 0 0-2.85 17.54c.45.08.62-.2.62-.43v-1.5c-2.5.55-3.03-1.2-3.03-1.2-.4-1.05-1-1.32-1-1.32-.83-.57.06-.56.06-.56.9.06 1.38.94 1.38.94.8 1.4 2.1 1 2.6.76.08-.6.32-1 .58-1.23-2-.23-4.1-1-4.1-4.5 0-1 .35-1.8.92-2.44-.1-.23-.4-1.16.09-2.4 0 0 .76-.24 2.5.93a8.6 8.6 0 0 1 4.55 0c1.73-1.17 2.5-.93 2.5-.93.48 1.24.18 2.17.09 2.4.57.64.92 1.44.92 2.44 0 3.5-2.1 4.27-4.1 4.5.33.29.62.85.62 1.72v2.55c0 .23.16.51.62.43A9 9 0 0 0 12 3Z" />
  </NazeIcon>
);

export const IconPlay = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M7 4.5v15l13-7.5-13-7.5Z" />
  </NazeIcon>
);

export const IconRefresh = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8" />
    <path d="M20 4v4h-4" />
    <path d="M20 12a8 8 0 0 1-13.66 5.66L4 16" />
    <path d="M4 20v-4h4" />
  </NazeIcon>
);

export const IconSave = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M8 4v5h7V4" />
    <path d="M8 14h8v6H8Z" />
  </NazeIcon>
);

export const IconDelete = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M5 7h14" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
  </NazeIcon>
);

export const IconCheck = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M5 13l4.5 4.5L19 7" />
  </NazeIcon>
);

export const IconWarning = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </NazeIcon>
);

export const IconError = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5l5 5" />
    <path d="M14.5 9.5l-5 5" />
  </NazeIcon>
);

export const IconClose = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </NazeIcon>
);

export const IconMenu = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </NazeIcon>
);

export const IconChevron = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M9 6l6 6-6 6" />
  </NazeIcon>
);

/** Ikon peran AI — bentuk abstrak sengaja dibedakan dari logo resmi provider */
export const IconAI = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M12 3v3" />
    <path d="M12 18v3" />
    <path d="M3 12h3" />
    <path d="M18 12h3" />
    <circle cx="12" cy="12" r="4.5" />
  </NazeIcon>
);

export const IconClaude = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M12 4l2.6 6.2L21 12l-6.4 1.8L12 20l-2.6-6.2L3 12l6.4-1.8L12 4Z" />
  </NazeIcon>
);

export const IconGemini = (p: NazeIconProps) => (
  <NazeIcon {...p}>
    <path d="M12 4a8 8 0 0 0 8 8 8 8 0 0 0-8 8 8 8 0 0 0-8-8 8 8 0 0 0 8-8Z" />
  </NazeIcon>
);

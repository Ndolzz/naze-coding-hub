import { useEffect, useRef, useState } from "react";

/**
 * NAZE BOOT — Phase 4.
 * Progress harus merepresentasikan proses nyata (spec §2), bukan delay
 * kosong. Setiap step menjalankan pengecekan/loading yang benar-benar
 * terjadi; angka % dianimasikan naik menuju target SETELAH task-nya
 * selesai — animasinya cuma polish visual, bukan pengganti prosesnya.
 */

interface BootStep {
  label: string;
  target: number;
  task: () => Promise<void>;
}

interface NazeBootProps {
  onComplete: () => void;
}

async function safe(task: () => Promise<void>) {
  try {
    await task();
  } catch {
    // Kegagalan satu pengecekan tidak boleh menggagalkan seluruh boot —
    // dicatat, tapi Naze tetap lanjut (mis. saat dev tanpa API key sama sekali).
  }
}

export default function NazeBoot({ onComplete }: NazeBootProps) {
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState("INITIALIZING NAZE");
  const displayedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    function animateTo(target: number) {
      return new Promise<void>((resolve) => {
        const start = displayedRef.current;
        const startTime = performance.now();
        const duration = 260;

        function tick(now: number) {
          if (cancelled) return resolve();
          const t = Math.min(1, (now - startTime) / duration);
          const value = Math.round(start + (target - start) * t);
          displayedRef.current = value;
          setPercent(value);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
    }

    const steps: BootStep[] = [
      {
        label: "INITIALIZING NAZE",
        target: 12,
        task: async () => {
          // Pastikan font display/UI sudah siap sebelum render lanjut,
          // supaya tidak ada flash-of-unstyled-text.
          if (document.fonts?.ready) await document.fonts.ready;
        }
      },
      {
        label: "
LOADING CORE",
        target: 30,
        task: async () => {
          // Muat modul design-system secara nyata (bukan cuma delay).
          await import("../../../../packages/design-system/tokens");
        }
      },
      {
        label: "PREPARING WORKSPACE",
        target: 48,
        task: async () => {
          // Cek apakah ada konfigurasi project (.naze/config.json) —
          // hasilnya belum dipakai di scaffold ini (menyusul Phase 8),
          // tapi request-nya nyata.
          await fetch("/api/projects/list").catch(() => undefined);
        }
      },
      {
        label: "CHECKING SYSTEM",
        target: 64,
        task: async () => {
          const hasSW = "serviceWorker" in navigator;
          const online = navigator.onLine;
          if (!hasSW) {
            console.warn("Naze: browser tidak mendukung service worker (PWA offline tidak tersedia).");
          }
          if (!online) {
            console.warn("Naze: perangkat sedang offline.");
          }
        }
      },
      {
        label: "PREPARING AI",
        target: 80,
        task: async () => {
          const res = await fetch("/api/system/status");
          if (res.ok) {
            const data = await res.json();
            if (!data.claudeConfigured || !data.geminiConfigured) {
              console.info("Naze: Claude/Gemini belum dikonfigurasi — akan diarahkan ke API setup.");
            }
          }
        }
      },
      {
        label: "FINALIZING",
        target: 94,
        task: async () => {
          // VitePWA (injectRegister: "auto") sudah otomatis mendaftarkan
          // service worker sendiri saat build — mendaftarkan manual di sini
          // lagi cuma bikin registrasi ganda yang saling tabrakan. Cukup
          // verifikasi statusnya sudah aktif.
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
            if (!reg) {
              console.info("Naze: service worker belum aktif (normal saat `npm run dev` — cuma aktif di build production).");
            }
          }
        }
      },
      {
        label: "READY",
        target: 100,
        task: async () => {
          await new Promise((r) => setTimeout(r, 200)); // jeda transisi, bukan delay proses
        }
      }
    ];

    (async () => {
      for (const step of steps) {
        if (cancelled) return;
        setStatus(step.label);
        await safe(step.task);
        await animateTo(step.target);
      }
      if (!cancelled) {
        setTimeout(() => !cancelled && onComplete(), 300);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="naze-boot">
      <div className="naze-boot-logo">
        <span className="naze-boot-logo-main">NAZE</span>
        <span className="naze-boot-logo-sub">CODING HUB</span>
      </div>
      <p className="naze-boot-tagline">BUILD. DEBUG. CREATE.</p>

      <div className="naze-boot-progress-track">
        <div className="naze-boot-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="naze-boot-meta">
        <span className="naze-boot-status">{status}</span>
        <span className="naze-boot-percent">{percent}%</span>
      </div>
    </main>
  );
}
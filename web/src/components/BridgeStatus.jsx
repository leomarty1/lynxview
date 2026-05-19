// BridgeStatus.jsx — pastille online/offline charte Lynxter.

import { useEffect, useState } from "react";
import { pingStatus } from "../lib/api.js";

export default function BridgeStatus({ baseUrl }) {
  const [status, setStatus] = useState({ ok: false, lastPingAt: 0 });

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      // Skip si tab en arrière-plan : pas la peine de poller un bridge local
      // alors que l'utilisateur regarde un autre onglet.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const data = await pingStatus(baseUrl);
        if (!cancelled) {
          setStatus({ ok: true, ...data, lastPingAt: Date.now() });
        }
      } catch (_err) {
        if (!cancelled) setStatus({ ok: false, lastPingAt: Date.now() });
      }
    }
    tick();
    const id = setInterval(tick, 10_000);
    // Tick immédiat quand le tab revient au premier plan (rafraîchit la
    // pastille sans attendre 10s).
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [baseUrl]);

  const dotClass = status.ok ? "lx-dot lx-dot--ok" : "lx-dot lx-dot--err";
  const label = status.ok
    ? `Bridge online · uptime ${formatUptime(status.uptimeSec || 0)}`
    : "Bridge offline";

  return (
    <div
      className="flex items-center gap-2 text-xs text-lx-muted"
      title={status.pluginPath || ""}
    >
      <span className={dotClass} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function formatUptime(sec) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400)
    return `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(sec / 86400)}j`;
}

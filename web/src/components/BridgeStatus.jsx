// BridgeStatus.jsx — pastille online/offline + uptime.
// Ping /status toutes les 10s.

import { useEffect, useState } from "react";
import { pingStatus } from "../lib/api.js";

export default function BridgeStatus({ baseUrl, onAuthError }) {
  const [status, setStatus] = useState({ ok: false, lastPingAt: 0 });

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const data = await pingStatus(baseUrl);
        if (!cancelled) {
          setStatus({ ok: true, ...data, lastPingAt: Date.now() });
        }
      } catch (err) {
        if (!cancelled) setStatus({ ok: false, lastPingAt: Date.now() });
      }
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [baseUrl]);

  const colorClass = status.ok ? "bg-lx-ok" : "bg-lx-err";
  const label = status.ok
    ? `Bridge online — uptime ${formatUptime(status.uptimeSec || 0)}`
    : "Bridge offline — lance `npm run bridge` ou attends l'autostart";

  return (
    <div className="flex items-center gap-2 text-xs text-lx-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${colorClass}`} />
      <span title={status.pluginPath || ""}>{label}</span>
    </div>
  );
}

function formatUptime(sec) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}j`;
}

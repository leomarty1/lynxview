// BridgeStatus.jsx (Atelier) — pastille verte pulse + uptime.
// Reprend les classes a-bridge / a-bridge__dot du design handoff.

import { useEffect, useState } from "react";
import { pingStatus } from "../../lib/api.js";

export default function BridgeStatusAtelier({ baseUrl }) {
  const [status, setStatus] = useState({ ok: false });

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const data = await pingStatus(baseUrl);
        if (!cancelled) setStatus({ ok: true, ...data });
      } catch {
        if (!cancelled) setStatus({ ok: false });
      }
    }
    tick();
    const id = setInterval(tick, 10_000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [baseUrl]);

  const dotStyle = status.ok
    ? {}
    : { background: "var(--lx-red)", boxShadow: "0 0 0 3px rgba(241,62,63,0.18)", animation: "none" };

  return (
    <div className="a-bridge">
      <span className="a-bridge__dot" style={dotStyle} />
      <div>
        <div className="a-bridge__lbl">
          {status.ok ? "Bridge online" : "Bridge hors-ligne"}
        </div>
        <div className="a-bridge__sub">
          {status.ok
            ? `uptime ${formatUptime(status.uptimeSec || 0)}`
            : "vérifie qu'il tourne"}
        </div>
      </div>
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

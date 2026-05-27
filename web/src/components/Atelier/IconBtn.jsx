// IconBtn.jsx — petit bouton carré pour les actions inline (archiver, supprimer).
// Hover géré en JS pour rester proche du design handoff sans toucher au CSS global.

export default function IconBtn({ children, title, onClick, danger, pulsing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: pulsing
          ? "var(--lx-red)"
          : danger
            ? "rgba(241,62,63,0.08)"
            : "rgba(64,62,61,0.08)",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        color: pulsing ? "#fff" : danger ? "var(--lx-red)" : "var(--ink-2)",
        transition: "all 0.12s ease",
        animation: pulsing ? "blink 0.8s infinite" : "none",
      }}
      onMouseEnter={(e) => {
        if (pulsing) return;
        e.currentTarget.style.background = danger
          ? "rgba(241,62,63,0.18)"
          : "rgba(64,62,61,0.16)";
      }}
      onMouseLeave={(e) => {
        if (pulsing) return;
        e.currentTarget.style.background = danger
          ? "rgba(241,62,63,0.08)"
          : "rgba(64,62,61,0.08)";
      }}
    >
      {children}
    </button>
  );
}

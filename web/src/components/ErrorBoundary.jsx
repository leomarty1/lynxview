// ErrorBoundary.jsx — wrappe l'app pour éviter qu'un crash de rendu
// (markdown malformé, event SSE inattendu) fasse tomber toute l'UI.
// React 18 ne fournit pas d'ErrorBoundary natif, il faut un class component.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[lynxview] crash:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          background: "#f5f4f1",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            background: "#fff",
            border: "1px solid #e9e4d8",
            borderRadius: 20,
            padding: "32px",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "var(--lx-red)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            ! Crash UI
          </div>
          <h1
            className="outfit"
            style={{ fontSize: 28, margin: "0 0 12px", lineHeight: 1.1 }}
          >
            L'interface a planté
          </h1>
          <p style={{ fontSize: 14, color: "#6b6764", margin: "0 0 20px" }}>
            Une erreur inattendue a interrompu le rendu. Tes données sont
            préservées (localStorage intact). Recharge pour repartir.
          </p>
          <details
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#97938e",
              background: "#f9f7f2",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <summary style={{ cursor: "pointer" }}>Détail technique</summary>
            <pre
              style={{
                margin: "8px 0 0",
                whiteSpace: "pre-wrap",
                fontSize: 10.5,
              }}
            >
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </details>
          <button
            type="button"
            onClick={this.handleReload}
            className="a-btn a-btn--primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px 24px" }}
          >
            Recharger l'app
          </button>
        </div>
      </div>
    );
  }
}

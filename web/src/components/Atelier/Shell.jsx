// Shell.jsx — layout principal Atelier : sidebar fixe + main avec routing.
// Reprend les classes a-side / a-nav / a-bridge / a-darktog / a-user du
// design handoff. Le routing est interne (useState), pas de router lib.

import { useState } from "react";
import AtelierAssistant from "./Assistant.jsx";
import AtelierGithub from "./Github.jsx";
import AtelierTickets from "./Tickets.jsx";
import AtelierKnowledge from "./Knowledge.jsx";
import BridgeStatusAtelier from "./BridgeStatus.jsx";

const NAV = [
  { id: "assistant", icon: "✦", label: "Assistant", hint: "A" },
  { id: "tickets", icon: "✉", label: "Tickets", hint: "T" },
  { id: "github", icon: "◉", label: "Github", hint: "G" },
  { id: "knowledge", icon: "❋", label: "Knowledge", hint: "K" },
];

export default function AtelierShell({ baseUrl, token, onReset }) {
  const [route, setRoute] = useState("assistant");
  const [dark, setDark] = useState(false);

  return (
    <div
      className={`atelier ${dark ? "atelier--dark" : ""}`}
      // Force le shell à couvrir toute la viewport — sans ça la div n'a pas
      // de hauteur (le `flex: 1` du CSS attend un parent flex container) et
      // un bandeau blanc apparaît en bas en mode sombre.
      style={{ minHeight: "100vh", display: "flex" }}
    >
      <AtelierSidebar
        route={route}
        setRoute={setRoute}
        dark={dark}
        setDark={setDark}
        baseUrl={baseUrl}
        onReset={onReset}
      />
      <main className="a-main">
        {route === "assistant" && (
          <AtelierAssistant baseUrl={baseUrl} token={token} setRoute={setRoute} />
        )}
        {route === "tickets" && <AtelierTickets />}
        {route === "github" && <AtelierGithub baseUrl={baseUrl} token={token} />}
        {route === "knowledge" && <AtelierKnowledge baseUrl={baseUrl} token={token} />}
      </main>
    </div>
  );
}

function AtelierSidebar({ route, setRoute, dark, setDark, baseUrl, onReset }) {
  return (
    <aside className="a-side">
      {/* Branding : mark L + dot bleu + wordmark + sub mono */}
      <div className="a-brand">
        <div className="a-mark">
          <span className="a-mark__a">L</span>
          <span className="a-mark__dot" />
        </div>
        <div className="a-brand__txt">
          <div className="a-brand__name">Lynxview</div>
          <div className="a-brand__sub">atelier · v0.4</div>
        </div>
      </div>

      {/* Nav 4 entrées */}
      <nav className="a-nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setRoute(n.id)}
            className={`a-nav__item ${route === n.id ? "is-active" : ""}`}
            title={`${n.label} (raccourci ${n.hint})`}
          >
            <span className="a-nav__icon">{n.icon}</span>
            <span className="a-nav__label">{n.label}</span>
            <span className="a-nav__hint">{n.hint}</span>
          </button>
        ))}
      </nav>

      {/* Footer : bridge status + dark toggle + user */}
      <div className="a-side__foot">
        <BridgeStatusAtelier baseUrl={baseUrl} />

        <button
          type="button"
          onClick={() => setDark(!dark)}
          className="a-darktog"
          title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
          aria-label="Bascule thème"
        >
          {dark ? "☀" : "☾"}
        </button>

        <div className="a-user">
          <div className="a-avatar">LM</div>
          <div>
            <div className="a-user__name">leomarty1</div>
            <div className="a-user__role">SAV · Bayonne</div>
          </div>
        </div>

        {/* Reset discret pour repartir au TokenSetup */}
        <button
          type="button"
          onClick={onReset}
          className="a-chip"
          style={{ alignSelf: "flex-start", marginTop: "4px" }}
          title="Effacer token et repartir au setup"
        >
          Reset connexion
        </button>
      </div>
    </aside>
  );
}

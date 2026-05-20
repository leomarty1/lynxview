// Knowledge.jsx — page Knowledge Atelier.
//
// Phase 3 (v0.4 initial) : pour ne pas retarder le déploiement, on affiche
// les catégories et un set de cartes "à venir" en attendant l'endpoint
// /knowledge côté bridge. Quand le bridge exposera la KB
// (lynxter-support-cc/references/*.md), on remplace par un fetch réel.

import { useState } from "react";

const CATS = [
  { id: "all", label: "Toutes" },
  { id: "machines", label: "Machines" },
  { id: "materiaux", label: "Matériaux" },
  { id: "safety", label: "Safety" },
  { id: "process", label: "Process SAV" },
  { id: "kb", label: "KB générale" },
];

const COMING_SOON = [
  { cat: "machines", title: "Parc machines (PARC_MACHINES.md)", updated: "à venir", reads: "—" },
  { cat: "kb", title: "Historique solutions terrain", updated: "à venir", reads: "—" },
  { cat: "kb", title: "Escalades", updated: "à venir", reads: "—" },
  { cat: "kb", title: "Tickets index", updated: "à venir", reads: "—" },
  { cat: "safety", title: "Safety keywords + log", updated: "à venir", reads: "—" },
  { cat: "process", title: "Patches & backlog améliorations", updated: "à venir", reads: "—" },
];

export default function AtelierKnowledge() {
  const [cat, setCat] = useState("all");
  const list = cat === "all" ? COMING_SOON : COMING_SOON.filter((a) => a.cat === cat);

  return (
    <div className="a-page">
      <header className="a-pagehead">
        <div>
          <div className="a-pagehead__eyebrow">› kb</div>
          <h1 className="a-pagehead__title">Knowledge</h1>
        </div>
        <div className="a-pagehead__actions">
          <input
            type="search"
            className="a-search"
            placeholder="Chercher dans la KB…"
            disabled
          />
        </div>
      </header>

      <div className="a-kb">
        <aside className="a-kb__cats">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`a-kb__cat ${cat === c.id ? "is-on" : ""}`}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </aside>

        <div className="a-kb__list">
          {list.map((a, i) => (
            <article key={i} className="a-kb__item" style={{ cursor: "default", opacity: 0.7 }}>
              <span className="a-kb__cat-tag">{a.cat}</span>
              <h3 className="a-kb__title">{a.title}</h3>
              <div className="a-kb__meta">
                <span>maj {a.updated}</span>
                <span>{a.reads} lectures</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <p
        style={{
          marginTop: "20px",
          fontSize: "12px",
          color: "var(--ink-3)",
          maxWidth: "640px",
          lineHeight: "1.5",
        }}
      >
        🚧 Page en construction. La KB ({" "}
        <code>lynxter-support-cc/references/</code>) sera connectée via un
        endpoint <code>/knowledge</code> côté bridge à la prochaine itération.
        Les fichiers réels seront listés avec leur dernière maj.
      </p>
    </div>
  );
}

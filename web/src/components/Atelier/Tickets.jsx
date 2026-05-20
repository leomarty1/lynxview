// Tickets.jsx — page Tickets Atelier.
// HubSpot a été retiré v0.3.1 (pas d'accès admin Lynxter pour Private App
// ni envie de créer un Developer Account). La page affiche un état
// "non configuré" avec lien direct vers HubSpot UI native + alternatives.

export default function AtelierTickets() {
  return (
    <div className="a-page">
      <header className="a-pagehead">
        <div>
          <div className="a-pagehead__eyebrow">› tickets</div>
          <h1 className="a-pagehead__title">Tickets</h1>
        </div>
      </header>

      <div className="a-empty" style={{ maxWidth: "640px" }}>
        <div className="a-empty__mark">✉</div>
        <h2 className="a-empty__title">HubSpot non configuré</h2>
        <p className="a-empty__sub">
          L'intégration HubSpot dans LYNXVIEW nécessite soit une Private App
          (admin du portal Lynxter), soit un Developer Account + Public App OAuth.
          Aucune n'est configurée pour l'instant.
        </p>

        <div className="a-empty__skills">
          <a
            href="https://app.hubspot.com/contacts/9039170/tickets/list/view/all/"
            target="_blank"
            rel="noopener noreferrer"
            className="a-empty__skill"
            style={{ textDecoration: "none" }}
          >
            <span className="a-empty__skillIcon">↗</span>
            <span className="a-empty__skillLbl">Ouvrir HubSpot</span>
            <span className="a-empty__skillDesc">app.hubspot.com — ta queue native</span>
          </a>
          <div
            className="a-empty__skill"
            style={{ cursor: "default", opacity: 0.7 }}
          >
            <span className="a-empty__skillIcon">✦</span>
            <span className="a-empty__skillLbl">MCP HubSpot</span>
            <span className="a-empty__skillDesc">
              Utilise <code>claude</code> en terminal interactif : le connecteur est déjà
              actif chez toi (commande /hubspot).
            </span>
          </div>
        </div>

        <p
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "var(--ink-3)",
            lineHeight: "1.5",
          }}
        >
          Pour activer ce panneau :
          <br />
          <strong style={{ color: "var(--ink-2)" }}>(A)</strong> obtenir une Private App
          token d'un admin Lynxter et la déposer dans{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>%APPDATA%\lynxter-bridge\hubspot-token.txt</code>, ou
          <br />
          <strong style={{ color: "var(--ink-2)" }}>(B)</strong> créer une Public App
          sur HubSpot Developer (le code OAuth est dormant dans le bridge,
          réactivable). Voir README.
        </p>
      </div>
    </div>
  );
}

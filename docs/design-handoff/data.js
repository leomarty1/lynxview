// Shared mock data for both variants

const SKILLS = [
  { id: 'auto', label: 'Auto (claude détecte)', icon: '✦', desc: 'Claude choisit le bon skill' },
  { id: 'diagnostic', label: '/diagnostic', icon: '⚙', desc: 'Analyse panne S300X / S300 / TDS', color: '#c2410c' },
  { id: 'mail-client', label: '/mail-client', icon: '✉', desc: 'Rédige une réponse client polie', color: '#0369a1' },
  { id: 'cr', label: '/cr', icon: '◷', desc: 'Compte-rendu intervention', color: '#15803d' },
  { id: 'devis', label: '/devis', icon: '€', desc: 'Génère un devis SAV', color: '#7c2d12' },
  { id: 'tuto', label: '/tuto', icon: '✎', desc: 'Tuto pas-à-pas client', color: '#6d28d9' },
  { id: 'github', label: '/github', icon: '◉', desc: 'Crée une issue Github structurée', color: '#1f2937' },
];

const HISTORY = [
  { id: 'h1', skill: 'diagnostic', title: 'S300X heater fault au démarrage', preview: 'Une S300X affiche heater fault au démarrage. Pas de fumée. Cause possible : thermistor débranché ou…', time: '12:24', date: 'Aujourd\'hui', tag: 'urgent', fav: true, client: 'Décathlon Lab' },
  { id: 'h2', skill: 'mail-client', title: 'Réponse retard livraison filament PEEK', preview: 'Bonjour Mme Lefèvre, suite à votre message du 18 mai concernant le retard de votre commande…', time: '11:48', date: 'Aujourd\'hui', tag: 'client', fav: false, client: 'Naval Group' },
  { id: 'h3', skill: 'cr', title: 'CR intervention SIL001 ENSAM', preview: 'Intervention du 17/05 sur site ENSAM Bordeaux. Remplacement carte mère TDS-MB-04, recalibration…', time: '10:02', date: 'Aujourd\'hui', tag: 'sav', fav: true, client: 'ENSAM Bordeaux' },
  { id: 'h4', skill: 'diagnostic', title: 'Bourrage extrudeur récurrent S300', preview: 'Bourrage extrudeur S300 sur PA-CF, 3e occurrence ce mois. Vérifié couple moteur ok, buse propre…', time: '09:15', date: 'Aujourd\'hui', tag: 'urgent', fav: false, client: 'Safran' },
  { id: 'h5', skill: 'tuto', title: 'Tuto calibration pompe granulés', preview: 'Étape 1 — préchauffer la zone de fusion à 240°C. Étape 2 — vérifier la pression d\'admission…', time: '17:32', date: 'Hier', tag: 'doc', fav: false, client: '—' },
  { id: 'h6', skill: 'mail-client', title: 'Mail Erik Mellberg — Service Pack', preview: 'Hi Erik, regarding your request for the SIL001 service pack including TDS/SDS sheets…', time: '16:11', date: 'Hier', tag: 'client', fav: true, client: 'KTH Stockholm' },
  { id: 'h7', skill: 'devis', title: 'Devis remplacement plateau S300X', preview: 'Devis n°2026-0418 — Plateau chauffant S300X complet + main d\'œuvre 2h + déplacement…', time: '14:55', date: 'Hier', tag: 'sav', fav: false, client: 'Stellantis' },
  { id: 'h8', skill: 'diagnostic', title: 'Bridge offline TDS Lyon', preview: 'Le bridge TDS de Lyon est offline depuis 06:00. Ping serveur ok mais le service lynx-bridge…', time: '11:09', date: '18 mai', tag: 'urgent', fav: false, client: 'CEA Cadarache' },
  { id: 'h9', skill: 'github', title: 'Issue: race condition slicer queue', preview: 'Quand 2 jobs sont envoyés à <100ms d\'intervalle, le second écrase parfois le premier…', time: '15:40', date: '17 mai', tag: 'dev', fav: false, client: '—' },
];

const TICKETS = [
  { id: 'T-2841', subject: 'Heater fault au démarrage', client: 'Décathlon Lab', contact: 'Yannis Bouchard', machine: 'S300X · #SX-2024-118', priority: 'P1', state: 'À traiter', age: '2h', channel: 'mail', sla: '4h restantes' },
  { id: 'T-2840', subject: 'Bourrage récurrent PA-CF', client: 'Safran', contact: 'Mélanie Roche', machine: 'S300 · #SX-2023-072', priority: 'P2', state: 'En cours', age: '5h', channel: 'mail', sla: '19h restantes' },
  { id: 'T-2839', subject: 'Retard livraison filament PEEK 2.5kg', client: 'Naval Group', contact: 'Mme Lefèvre', machine: '—', priority: 'P3', state: 'En cours', age: '1j', channel: 'mail', sla: '2j restantes' },
  { id: 'T-2838', subject: 'Service pack TDS/SDS SIL001', client: 'KTH Stockholm', contact: 'Erik Mellberg', machine: 'SIL001', priority: 'P2', state: 'En attente client', age: '2j', channel: 'mail', sla: 'paused' },
  { id: 'T-2837', subject: 'Plateau chauffant à remplacer', client: 'Stellantis', contact: 'David Onfroy', machine: 'S300X · #SX-2022-041', priority: 'P2', state: 'Devis envoyé', age: '3j', channel: 'phone', sla: 'paused' },
  { id: 'T-2836', subject: 'Bridge offline depuis 06:00', client: 'CEA Cadarache', contact: 'L. Mariotte', machine: 'TDS · #TDS-2024-009', priority: 'P1', state: 'Résolu', age: '4j', channel: 'mail', sla: 'closed' },
  { id: 'T-2835', subject: 'Demande tuto calibration pompe granulés', client: 'CRITT Composites', contact: 'P. Vasseur', machine: 'S300X-G', priority: 'P3', state: 'À traiter', age: '6h', channel: 'mail', sla: '1j restantes' },
  { id: 'T-2834', subject: 'Recalibration plateau après crash tête', client: 'ENSAM Bordeaux', contact: 'J. Cadiou', machine: 'SIL001', priority: 'P2', state: 'En cours', age: '8h', channel: 'phone', sla: '16h restantes' },
];

const GITHUB_ISSUES = {
  'Backlog': [
    { num: 527, title: 'Wishlist Core', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 3j', labels: ['feature', 'core'], body: 'Refonte de la wishlist côté SAV : agréger les demandes de features depuis les tickets clients récurrents. Idéalement un export CSV pour le PM.' },
    { num: 808, title: 'Réalisation + rangement stock pièces maintenance 2026 S1', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 2j', labels: ['ops', 'inventory'], body: 'Inventaire complet des pièces SAV stockées. Vérifier seuils de réappro pour Q1 2026.' },
  ],
  'Done': [
    { num: 978, title: 'Relire le tuto calib pompe de Léo', priority: 'URGENT', assignee: 'leomarty1', updated: 'il y a 4h', labels: ['doc', 'review'], body: 'Tuto rédigé par Léo, relecture technique + français. Validé avec L. ce matin, prêt à publier sur la KB.', closed: true },
  ],
  'Stand-by': [
    { num: 1073, title: 'Mail Erik Mellberg (1X) — TDS/SDS SIL001 + Service Pack + STL', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 1j', labels: ['client', 'doc'], body: 'En attente retour du service réglementaire pour TDS révisé. Erik patient mais attend pour mardi prochain.' },
  ],
  'Today / In progress': [
    { num: 1035, title: 'Revoir le project CS_maintenance sur Github', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 1h', labels: ['ops'], body: 'Le board CS_maintenance contient encore des cartes de 2024. Archiver + restructurer les colonnes.' },
  ],
  'Validation': [
    { num: 927, title: 'Intégration mail support dans Hubspot', priority: 'Haute', assignee: 'leomarty1', updated: 'il y a 2j', labels: ['integration', 'crm'], body: 'Webhook entre support@lynxter et Hubspot OK en staging. À valider en prod ce vendredi.' },
    { num: 970, title: 'Livret de formation S300X FIL', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 3j', labels: ['doc', 'formation'], body: 'Livret PDF 24 pages, version FR finalisée. EN en cours de traduction.' },
    { num: 807, title: 'Aménagement câble espace SAV', priority: 'Moyenne', assignee: 'leomarty1', updated: 'il y a 5j', labels: ['ops'], body: 'Câblage atelier SAV pour 3 nouveaux postes. Devis électricien reçu, à valider.' },
  ],
  'This week': [
    { num: 915, title: 'Projet déménagement espaces SAV', priority: 'Haute', assignee: 'leomarty1', updated: 'il y a 1j', labels: ['ops', 'planning'], body: 'Déménagement SAV au bâtiment B prévu semaine 23. Checklist matériel + planning équipe à finaliser.' },
  ],
};

const KNOWLEDGE = [
  { id: 'k1', cat: 'S300X', title: 'Heater fault — checklist 7 points', updated: 'mis à jour le 12 mai', reads: 248 },
  { id: 'k2', cat: 'S300X', title: 'Calibration plateau après crash tête', updated: 'mis à jour le 8 mai', reads: 117 },
  { id: 'k3', cat: 'S300', title: 'Bourrage extrudeur — diagnostic par matériau', updated: 'mis à jour le 5 mai', reads: 312 },
  { id: 'k4', cat: 'SIL001', title: 'TDS / SDS — où trouver les fiches à jour', updated: 'mis à jour le 2 mai', reads: 89 },
  { id: 'k5', cat: 'TDS', title: 'Bridge offline — procédure de redémarrage', updated: 'mis à jour le 28 avr', reads: 401 },
  { id: 'k6', cat: 'Général', title: 'Templates de réponse client (FR/EN)', updated: 'mis à jour le 25 avr', reads: 522 },
  { id: 'k7', cat: 'S300X-G', title: 'Calibration pompe granulés — pas à pas', updated: 'mis à jour le 20 avr', reads: 76 },
  { id: 'k8', cat: 'Général', title: 'Codes erreur — référence complète', updated: 'mis à jour le 18 avr', reads: 690 },
];

// Sample streaming response for /diagnostic on the S300X heater fault
const SAMPLE_RESPONSE = `**Diagnostic — S300X heater fault au démarrage**

Cause probable (95% des cas observés) : thermistor de la zone hotend déconnecté ou en circuit ouvert. Sans fumée, on écarte un court-circuit du chauffant.

**Checklist à faire faire au client (dans l'ordre)**

1. Couper la machine, débrancher le secteur, attendre 5 min.
2. Ouvrir le capot tête, vérifier le connecteur **JX-12** du thermistor — souvent détaché après un crash tête.
3. Mesurer la résistance thermistor froid : doit être ≈ **100 kΩ à 25°C**. Si ∞ → thermistor HS, référence pièce **TH-S300-04**.
4. Si JX-12 et thermistor OK, vérifier la cartouche chauffante côté carte (J7). Résistance attendue : **3,8 Ω ± 0,2**.

**Si tout est OK côté hardware** → mise à jour firmware vers **v4.2.7** (la 4.2.5 a un bug de lecture ADC connu sur les S300X série 118+).

**Prochaine étape suggérée** : générer un mail client avec ces étapes ? \`/mail-client\``;

Object.assign(window, { SKILLS, HISTORY, TICKETS, GITHUB_ISSUES, KNOWLEDGE, SAMPLE_RESPONSE });

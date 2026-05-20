// Variant A — "Atelier"
// Warm cream / deep ink, serif display + sans body + mono technical detail.
// Vibe: craftsman's workbench app, calm and editorial.

const { useState: aUseState, useEffect: aUseEffect, useMemo: aUseMemo, useRef: aUseRef } = React;

function Atelier({ dark, setDark }) {
  const [route, setRoute] = aUseState('assistant');
  const [activeHistory, setActiveHistory] = aUseState('h1');
  return React.createElement('div', { className: `atelier ${dark ? 'atelier--dark' : ''}` },
    React.createElement(AtelierSidebar, { route, setRoute, dark, setDark }),
    React.createElement('main', { className: 'a-main' },
      route === 'assistant' && React.createElement(AtelierAssistant, { activeHistory, setActiveHistory }),
      route === 'tickets' && React.createElement(AtelierTickets, null),
      route === 'github' && React.createElement(AtelierGithub, null),
      route === 'knowledge' && React.createElement(AtelierKnowledge, null),
    ),
  );
}

function AtelierSidebar({ route, setRoute, dark, setDark }) {
  const nav = [
    { id: 'assistant', icon: '✦', label: 'Assistant', hint: 'A' },
    { id: 'tickets', icon: '✉', label: 'Tickets', hint: 'T', badge: 3 },
    { id: 'github', icon: '◉', label: 'Github', hint: 'G' },
    { id: 'knowledge', icon: '❋', label: 'Knowledge', hint: 'K' },
  ];
  return React.createElement('aside', { className: 'a-side' },
    React.createElement('div', { className: 'a-brand' },
      React.createElement('div', { className: 'a-mark' },
        React.createElement('span', { className: 'a-mark__a' }, 'L'),
        React.createElement('span', { className: 'a-mark__dot' }),
      ),
      React.createElement('div', { className: 'a-brand__txt' },
        React.createElement('div', { className: 'a-brand__name' }, 'Lynxview'),
        React.createElement('div', { className: 'a-brand__sub' }, 'atelier · v2.4'),
      ),
    ),
    React.createElement('nav', { className: 'a-nav' },
      nav.map(n => React.createElement('button', {
        key: n.id, onClick: () => setRoute(n.id),
        className: `a-nav__item ${route === n.id ? 'is-active' : ''}`,
      },
        React.createElement('span', { className: 'a-nav__icon' }, n.icon),
        React.createElement('span', { className: 'a-nav__label' }, n.label),
        n.badge ? React.createElement('span', { className: 'a-nav__badge' }, n.badge) : null,
        React.createElement('span', { className: 'a-nav__hint' }, n.hint),
      ))
    ),
    React.createElement('div', { className: 'a-side__foot' },
      React.createElement('div', { className: 'a-bridge' },
        React.createElement('span', { className: 'a-bridge__dot' }),
        React.createElement('div', null,
          React.createElement('div', { className: 'a-bridge__lbl' }, 'Bridge online'),
          React.createElement('div', { className: 'a-bridge__sub' }, 'uptime 3m · 142 req/h'),
        ),
      ),
      React.createElement('button', { className: 'a-darktog', onClick: () => setDark(!dark), title: 'Mode sombre' },
        dark ? '☀' : '☾'
      ),
      React.createElement('div', { className: 'a-user' },
        React.createElement('div', { className: 'a-avatar' }, 'LM'),
        React.createElement('div', null,
          React.createElement('div', { className: 'a-user__name' }, 'leomarty1'),
          React.createElement('div', { className: 'a-user__role' }, 'SAV · Bayonne'),
        ),
      ),
    ),
  );
}

// =================================================================
// ASSISTANT PAGE
// =================================================================
function AtelierAssistant({ activeHistory, setActiveHistory }) {
  const [skill, setSkill] = aUseState('diagnostic');
  const [prompt, setPrompt] = aUseState("Une S300X affiche heater fault au démarrage. Pas de fumée. Le client a redémarré 2x. Cause possible et étapes de diagnostic à lui envoyer ?");
  const [phase, setPhase] = aUseState('streaming'); // 'idle' | 'streaming' | 'result'
  const stream = useStreamingText(SAMPLE_RESPONSE, { autoStart: true });
  const [histFilter, setHistFilter] = aUseState('all');

  const launch = () => {
    setPhase('streaming');
    stream.start();
  };
  aUseEffect(() => {
    if (stream.done && phase === 'streaming') setPhase('result');
  }, [stream.done]);

  const filteredHistory = aUseMemo(() => {
    if (histFilter === 'all') return HISTORY;
    if (histFilter === 'fav') return HISTORY.filter(h => h.fav);
    return HISTORY.filter(h => h.tag === histFilter);
  }, [histFilter]);

  return React.createElement('div', { className: 'a-assistant' },
    // ===== history column =====
    React.createElement('section', { className: 'a-col a-col--hist' },
      React.createElement('header', { className: 'a-col__head' },
        React.createElement('h2', { className: 'a-col__title' }, 'Historique'),
        React.createElement('span', { className: 'a-col__count' }, `${HISTORY.length} entrées`),
      ),
      React.createElement('div', { className: 'a-hist__filters' },
        [
          { id: 'all', label: 'Tout' },
          { id: 'fav', label: '★ Favoris' },
          { id: 'urgent', label: 'Urgent' },
          { id: 'client', label: 'Client' },
          { id: 'sav', label: 'SAV' },
        ].map(f => React.createElement('button', {
          key: f.id, onClick: () => setHistFilter(f.id),
          className: `a-chip ${histFilter === f.id ? 'is-on' : ''}`,
        }, f.label))
      ),
      React.createElement('div', { className: 'a-hist__list' },
        groupByDate(filteredHistory).map(([date, items]) =>
          React.createElement('div', { key: date, className: 'a-hist__group' },
            React.createElement('div', { className: 'a-hist__date' }, date),
            items.map(h => React.createElement('button', {
              key: h.id, onClick: () => setActiveHistory(h.id),
              className: `a-hist__item ${activeHistory === h.id ? 'is-active' : ''}`,
            },
              React.createElement('div', { className: 'a-hist__row1' },
                React.createElement('span', { className: `a-skill-pill a-skill-pill--${h.skill}` }, '/' + h.skill),
                React.createElement('span', { className: 'a-hist__time' }, h.time),
              ),
              React.createElement('div', { className: 'a-hist__title' }, h.title),
              React.createElement('div', { className: 'a-hist__preview' }, h.preview),
              React.createElement('div', { className: 'a-hist__row3' },
                React.createElement('span', { className: 'a-hist__client' }, h.client),
                h.fav ? React.createElement('span', { className: 'a-hist__fav' }, '★') : null,
                React.createElement('span', { className: `a-tag a-tag--${h.tag}` }, h.tag),
              )
            ))
          )
        )
      ),
    ),
    // ===== composer + response =====
    React.createElement('section', { className: 'a-col a-col--main' },
      React.createElement(AtelierComposer, { skill, setSkill, prompt, setPrompt, launch, streaming: stream.streaming }),
      phase === 'idle'
        ? React.createElement(AtelierEmpty, { onPick: () => setSkill('diagnostic') })
        : React.createElement(AtelierResponse, { stream, phase, onCancel: stream.cancel, onRestart: () => { stream.reset(); launch(); }, prompt }),
    ),
    // ===== context column =====
    React.createElement('section', { className: 'a-col a-col--ctx' },
      React.createElement(AtelierContext, { ticketRef: 'T-2841' }),
    ),
  );
}

function groupByDate(items) {
  const map = new Map();
  items.forEach(h => {
    if (!map.has(h.date)) map.set(h.date, []);
    map.get(h.date).push(h);
  });
  return [...map.entries()];
}

function AtelierComposer({ skill, setSkill, prompt, setPrompt, launch, streaming }) {
  const [open, setOpen] = aUseState(false);
  const current = SKILLS.find(s => s.id === skill);
  return React.createElement('div', { className: 'a-composer' },
    React.createElement('div', { className: 'a-composer__top' },
      React.createElement('div', { className: 'a-skillpick', onClick: () => setOpen(!open) },
        React.createElement('span', { className: 'a-skillpick__lbl' }, 'Skill'),
        React.createElement('span', { className: 'a-skillpick__val' },
          React.createElement('span', { className: 'a-skillpick__icon' }, current.icon),
          current.label,
        ),
        React.createElement('span', { className: 'a-skillpick__chev' }, '⌄'),
        open && React.createElement('div', { className: 'a-skillpick__menu', onClick: e => e.stopPropagation() },
          SKILLS.map(s => React.createElement('button', {
            key: s.id, onClick: () => { setSkill(s.id); setOpen(false); },
            className: `a-skillpick__opt ${s.id === skill ? 'is-on' : ''}`,
          },
            React.createElement('span', { className: 'a-skillpick__optIcon' }, s.icon),
            React.createElement('div', null,
              React.createElement('div', { className: 'a-skillpick__optLbl' }, s.label),
              React.createElement('div', { className: 'a-skillpick__optDesc' }, s.desc),
            )
          ))
        ),
      ),
      React.createElement('div', { className: 'a-composer__meta' },
        React.createElement('span', { className: 'a-meta-dot' }, 'Ticket lié · '),
        React.createElement('span', { className: 'a-meta-val' }, 'T-2841 · Décathlon Lab'),
      ),
    ),
    React.createElement('textarea', {
      className: 'a-textarea',
      value: prompt,
      onChange: e => setPrompt(e.target.value),
      placeholder: 'Décris le problème, ou colle le mail client…',
      rows: 4,
    }),
    React.createElement('div', { className: 'a-composer__foot' },
      React.createElement('div', { className: 'a-composer__hints' },
        React.createElement('kbd', null, 'Ctrl'), '+', React.createElement('kbd', null, '↵'), ' pour lancer · ',
        React.createElement('kbd', null, '/'), ' pour changer de skill',
      ),
      React.createElement('button', {
        className: 'a-btn a-btn--primary',
        onClick: launch, disabled: streaming,
      }, streaming ? '… génération' : 'Lancer ✦'),
    ),
  );
}

function AtelierEmpty({ onPick }) {
  return React.createElement('div', { className: 'a-empty' },
    React.createElement('div', { className: 'a-empty__mark' }, '✦'),
    React.createElement('h3', { className: 'a-empty__title' }, 'Prêt à rédiger.'),
    React.createElement('p', { className: 'a-empty__sub' }, 'Choisis un skill et décris la situation. Claude rédige, tu valides, le client est servi.'),
    React.createElement('div', { className: 'a-empty__skills' },
      SKILLS.slice(1, 6).map(s => React.createElement('button', {
        key: s.id, className: 'a-empty__skill', onClick: onPick,
      },
        React.createElement('span', { className: 'a-empty__skillIcon' }, s.icon),
        React.createElement('span', { className: 'a-empty__skillLbl' }, s.label),
        React.createElement('span', { className: 'a-empty__skillDesc' }, s.desc),
      )),
    ),
  );
}

function AtelierResponse({ stream, phase, onCancel, onRestart, prompt }) {
  return React.createElement('div', { className: 'a-response' },
    React.createElement('div', { className: 'a-response__head' },
      React.createElement('div', { className: 'a-response__title' },
        React.createElement('span', { className: 'a-response__icon' }, '✦'),
        'Réponse · ',
        React.createElement('span', { className: 'a-response__skill' }, '/diagnostic'),
      ),
      React.createElement('div', { className: 'a-response__actions' },
        phase === 'streaming' && React.createElement('span', { className: 'a-streaming' },
          React.createElement('span', { className: 'a-streaming__dot' }),
          'génération…'
        ),
        React.createElement('button', { className: 'a-ibtn', title: 'Copier' }, '⧉ copier'),
        React.createElement('button', { className: 'a-ibtn', title: 'Envoyer comme mail' }, '✉ envoyer'),
        phase === 'streaming'
          ? React.createElement('button', { className: 'a-ibtn', onClick: onCancel }, '✕ stop')
          : React.createElement('button', { className: 'a-ibtn', onClick: onRestart }, '↻ relancer'),
      ),
    ),
    React.createElement('div', { className: 'a-response__body' },
      React.createElement('div', { className: 'a-response__userprompt' },
        React.createElement('span', { className: 'a-response__userlbl' }, 'Toi'),
        React.createElement('p', null, prompt),
      ),
      React.createElement('div', { className: 'a-response__ai' },
        React.createElement('span', { className: 'a-response__userlbl a-response__userlbl--ai' }, 'Lynxview'),
        React.createElement('div', { className: 'a-md' },
          renderMarkdown(stream.output),
          phase === 'streaming' && React.createElement('span', { className: 'a-caret' }),
        ),
      ),
    ),
  );
}

function AtelierContext({ ticketRef }) {
  const t = TICKETS.find(x => x.id === ticketRef);
  const { hovered, onEnter, onLeave } = useHoverPreview();
  return React.createElement('div', { className: 'a-ctx' },
    React.createElement('h3', { className: 'a-ctx__title' }, 'Contexte'),
    React.createElement('div', { className: 'a-ctx__card' },
      React.createElement('div', { className: 'a-ctx__row' },
        React.createElement('span', { className: 'a-ctx__k' }, 'Ticket'),
        React.createElement('span', { className: 'a-ctx__v' }, t.id),
      ),
      React.createElement('div', { className: 'a-ctx__row' },
        React.createElement('span', { className: 'a-ctx__k' }, 'Client'),
        React.createElement('span', { className: 'a-ctx__v' }, t.client),
      ),
      React.createElement('div', { className: 'a-ctx__row' },
        React.createElement('span', { className: 'a-ctx__k' }, 'Contact'),
        React.createElement('span', { className: 'a-ctx__v' }, t.contact),
      ),
      React.createElement('div', { className: 'a-ctx__row' },
        React.createElement('span', { className: 'a-ctx__k' }, 'Machine'),
        React.createElement('span', { className: 'a-ctx__v a-mono' }, t.machine),
      ),
      React.createElement('div', { className: 'a-ctx__row' },
        React.createElement('span', { className: 'a-ctx__k' }, 'SLA'),
        React.createElement('span', { className: 'a-ctx__v a-ctx__v--warn' }, t.sla),
      ),
    ),
    React.createElement('h3', { className: 'a-ctx__title' }, 'Sources utilisées'),
    React.createElement('div', { className: 'a-ctx__sources' },
      [
        { icon: '❋', t: 'KB · Heater fault — checklist 7 points', s: 'reads 248' },
        { icon: '❋', t: 'KB · Codes erreur — référence complète', s: 'reads 690' },
        { icon: '◉', t: 'Issue #978 · Relire tuto calib pompe', s: 'closed · il y a 4h', issue: GITHUB_ISSUES['Done'][0] },
      ].map((s, i) => React.createElement('div', {
        key: i, className: 'a-src',
        onMouseEnter: s.issue ? e => onEnter(s.issue, e) : null,
        onMouseLeave: onLeave,
      },
        React.createElement('span', { className: 'a-src__icon' }, s.icon),
        React.createElement('div', { className: 'a-src__txt' },
          React.createElement('div', { className: 'a-src__t' }, s.t),
          React.createElement('div', { className: 'a-src__s' }, s.s),
        ),
      ))
    ),
    React.createElement('h3', { className: 'a-ctx__title' }, 'Suite logique'),
    React.createElement('div', { className: 'a-ctx__next' },
      React.createElement('button', { className: 'a-next' },
        React.createElement('span', { className: 'a-next__icon' }, '✉'),
        React.createElement('div', null,
          React.createElement('div', { className: 'a-next__t' }, 'Envoyer comme mail client'),
          React.createElement('div', { className: 'a-next__s' }, '/mail-client · template SAV-FR'),
        ),
      ),
      React.createElement('button', { className: 'a-next' },
        React.createElement('span', { className: 'a-next__icon' }, '◷'),
        React.createElement('div', null,
          React.createElement('div', { className: 'a-next__t' }, 'Générer un CR intervention'),
          React.createElement('div', { className: 'a-next__s' }, '/cr · si déplacement nécessaire'),
        ),
      ),
    ),
    hovered && React.createElement('div', { className: 'a-hover', style: { left: hovered.x, top: hovered.y } },
      React.createElement(IssueHover, { issue: hovered.issue, theme: 'atelier' })
    ),
  );
}

// =================================================================
// TICKETS PAGE
// =================================================================
function AtelierTickets() {
  const [filter, setFilter] = aUseState('all');
  const [active, setActive] = aUseState('T-2841');
  const filtered = filter === 'all' ? TICKETS
    : filter === 'p1' ? TICKETS.filter(t => t.priority === 'P1')
    : TICKETS.filter(t => t.state === filter);

  const t = TICKETS.find(x => x.id === active);

  return React.createElement('div', { className: 'a-page' },
    React.createElement('header', { className: 'a-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'a-pagehead__eyebrow' }, 'SAV · Tickets entrants'),
        React.createElement('h1', { className: 'a-pagehead__title' }, 'Tickets'),
      ),
      React.createElement('div', { className: 'a-pagehead__stats' },
        React.createElement(Stat, { v: '3', l: 'à traiter', tone: 'urgent' }),
        React.createElement(Stat, { v: '4', l: 'en cours' }),
        React.createElement(Stat, { v: '1', l: 'devis envoyé' }),
        React.createElement(Stat, { v: '92%', l: 'SLA tenu · 30j' }),
      ),
    ),
    React.createElement('div', { className: 'a-tickets' },
      React.createElement('div', { className: 'a-tickets__list' },
        React.createElement('div', { className: 'a-filter' },
          [
            { id: 'all', label: 'Tous' },
            { id: 'p1', label: 'P1' },
            { id: 'À traiter', label: 'À traiter' },
            { id: 'En cours', label: 'En cours' },
            { id: 'En attente client', label: 'En attente client' },
          ].map(f => React.createElement('button', {
            key: f.id, onClick: () => setFilter(f.id),
            className: `a-chip ${filter === f.id ? 'is-on' : ''}`,
          }, f.label))
        ),
        React.createElement('table', { className: 'a-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Ticket'),
              React.createElement('th', null, 'Sujet'),
              React.createElement('th', null, 'Client'),
              React.createElement('th', null, 'Machine'),
              React.createElement('th', null, 'P.'),
              React.createElement('th', null, 'État'),
              React.createElement('th', null, 'SLA'),
            )
          ),
          React.createElement('tbody', null,
            filtered.map(t => React.createElement('tr', {
              key: t.id, onClick: () => setActive(t.id),
              className: t.id === active ? 'is-active' : '',
            },
              React.createElement('td', { className: 'a-mono' }, t.id),
              React.createElement('td', null, t.subject),
              React.createElement('td', null, t.client),
              React.createElement('td', { className: 'a-mono a-dim' }, t.machine),
              React.createElement('td', null, React.createElement('span', { className: `a-prio a-prio--${t.priority.toLowerCase()}` }, t.priority)),
              React.createElement('td', null, React.createElement('span', { className: `a-state a-state--${slug(t.state)}` }, t.state)),
              React.createElement('td', { className: t.sla.includes('restantes') && t.sla.startsWith('4') ? 'a-sla-warn' : '' }, t.sla),
            ))
          )
        ),
      ),
      React.createElement('aside', { className: 'a-ticket__detail' },
        React.createElement('div', { className: 'a-ticket__head' },
          React.createElement('div', { className: 'a-ticket__id' }, t.id),
          React.createElement('span', { className: `a-prio a-prio--${t.priority.toLowerCase()}` }, t.priority),
        ),
        React.createElement('h2', { className: 'a-ticket__title' }, t.subject),
        React.createElement('div', { className: 'a-ticket__meta' },
          React.createElement('div', null, React.createElement('span', { className: 'a-ctx__k' }, 'Client'), React.createElement('span', { className: 'a-ctx__v' }, t.client)),
          React.createElement('div', null, React.createElement('span', { className: 'a-ctx__k' }, 'Contact'), React.createElement('span', { className: 'a-ctx__v' }, t.contact)),
          React.createElement('div', null, React.createElement('span', { className: 'a-ctx__k' }, 'Machine'), React.createElement('span', { className: 'a-ctx__v a-mono' }, t.machine)),
          React.createElement('div', null, React.createElement('span', { className: 'a-ctx__k' }, 'État'), React.createElement('span', { className: 'a-ctx__v' }, t.state)),
          React.createElement('div', null, React.createElement('span', { className: 'a-ctx__k' }, 'Âge'), React.createElement('span', { className: 'a-ctx__v' }, t.age)),
        ),
        React.createElement('div', { className: 'a-ticket__msg' },
          React.createElement('div', { className: 'a-ticket__msgFrom' }, `${t.contact} · ${t.channel === 'mail' ? 'mail' : 'téléphone'} · il y a ${t.age}`),
          React.createElement('p', null, "Bonjour, notre S300X affiche \"heater fault\" au démarrage depuis ce matin. On a redémarré 2 fois, même résultat. Pas de fumée, mais on n'ose pas insister. Pouvez-vous nous dire quoi vérifier en premier ? Merci."),
        ),
        React.createElement('div', { className: 'a-ticket__cta' },
          React.createElement('button', { className: 'a-btn a-btn--primary' }, '✦ Répondre avec l\'assistant'),
          React.createElement('button', { className: 'a-btn' }, '✉ Réponse manuelle'),
        ),
      ),
    ),
  );
}

function Stat({ v, l, tone }) {
  return React.createElement('div', { className: `a-stat ${tone ? 'a-stat--' + tone : ''}` },
    React.createElement('div', { className: 'a-stat__v' }, v),
    React.createElement('div', { className: 'a-stat__l' }, l),
  );
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

// =================================================================
// GITHUB PAGE
// =================================================================
function AtelierGithub() {
  const { hovered, onEnter, onLeave } = useHoverPreview();
  const cols = Object.keys(GITHUB_ISSUES);
  return React.createElement('div', { className: 'a-page' },
    React.createElement('header', { className: 'a-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'a-pagehead__eyebrow' }, 'Repo · lynxter / cs_maintenance'),
        React.createElement('h1', { className: 'a-pagehead__title' }, 'Github board'),
      ),
      React.createElement('div', { className: 'a-pagehead__actions' },
        React.createElement('button', { className: 'a-chip' }, '⌕ filtrer'),
        React.createElement('button', { className: 'a-chip' }, 'assignee : leomarty1'),
        React.createElement('button', { className: 'a-btn' }, '+ nouvelle issue'),
      ),
    ),
    React.createElement('div', { className: 'a-board' },
      cols.map(col => React.createElement('div', { key: col, className: 'a-board__col' },
        React.createElement('header', { className: 'a-board__colHead' },
          React.createElement('span', { className: 'a-board__colTitle' }, col),
          React.createElement('span', { className: 'a-board__count' }, GITHUB_ISSUES[col].length),
        ),
        React.createElement('div', { className: 'a-board__cards' },
          GITHUB_ISSUES[col].map(it => React.createElement('article', {
            key: it.num, className: 'a-card',
            onMouseEnter: e => onEnter(it, e), onMouseLeave: onLeave,
          },
            React.createElement('div', { className: 'a-card__head' },
              React.createElement('span', { className: 'a-card__num' }, `#${it.num}`),
              React.createElement('span', { className: `a-card__prio a-card__prio--${it.priority.toLowerCase()}` }, it.priority),
            ),
            React.createElement('div', { className: 'a-card__title' }, it.title),
            React.createElement('div', { className: 'a-card__labels' },
              it.labels.map((l, i) => React.createElement('span', { key: i, className: 'a-card__label' }, l))
            ),
            React.createElement('div', { className: 'a-card__foot' },
              React.createElement('span', null, '@' + it.assignee),
              React.createElement('span', null, it.updated),
            ),
          ))
        ),
      ))
    ),
    hovered && React.createElement('div', { className: 'a-hover', style: { left: hovered.x, top: hovered.y } },
      React.createElement(IssueHover, { issue: hovered.issue, theme: 'atelier' })
    ),
  );
}

// =================================================================
// KNOWLEDGE PAGE
// =================================================================
function AtelierKnowledge() {
  const [cat, setCat] = aUseState('Tous');
  const cats = ['Tous', ...new Set(KNOWLEDGE.map(k => k.cat))];
  const list = cat === 'Tous' ? KNOWLEDGE : KNOWLEDGE.filter(k => k.cat === cat);
  return React.createElement('div', { className: 'a-page' },
    React.createElement('header', { className: 'a-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'a-pagehead__eyebrow' }, 'Documentation interne'),
        React.createElement('h1', { className: 'a-pagehead__title' }, 'Knowledge'),
      ),
      React.createElement('div', { className: 'a-pagehead__actions' },
        React.createElement('input', { className: 'a-search', placeholder: '⌕ rechercher une procédure, un code erreur…' }),
      ),
    ),
    React.createElement('div', { className: 'a-kb' },
      React.createElement('aside', { className: 'a-kb__cats' },
        cats.map(c => React.createElement('button', {
          key: c, onClick: () => setCat(c),
          className: `a-kb__cat ${cat === c ? 'is-on' : ''}`,
        }, c))
      ),
      React.createElement('div', { className: 'a-kb__list' },
        list.map(k => React.createElement('article', { key: k.id, className: 'a-kb__item' },
          React.createElement('div', { className: 'a-kb__cat-tag' }, k.cat),
          React.createElement('h3', { className: 'a-kb__title' }, k.title),
          React.createElement('div', { className: 'a-kb__meta' },
            React.createElement('span', null, k.updated),
            React.createElement('span', null, k.reads + ' lectures'),
          ),
        ))
      ),
    ),
  );
}

window.Atelier = Atelier;

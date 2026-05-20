// Variant B — "Console"
// Dark-first, mono-heavy, phosphor accent, cockpit-y. Editorial dark theme.

const { useState: cUseState, useEffect: cUseEffect, useMemo: cUseMemo } = React;

function Console({ dark, setDark }) {
  const [route, setRoute] = cUseState('assistant');
  return React.createElement('div', { className: `console ${dark ? 'console--dark' : 'console--light'}` },
    React.createElement(ConsoleTopbar, { route, setRoute, dark, setDark }),
    React.createElement('main', { className: 'c-main' },
      route === 'assistant' && React.createElement(ConsoleAssistant, null),
      route === 'tickets' && React.createElement(ConsoleTickets, null),
      route === 'github' && React.createElement(ConsoleGithub, null),
      route === 'knowledge' && React.createElement(ConsoleKnowledge, null),
    ),
    React.createElement(ConsoleStatusbar, null),
  );
}

function ConsoleTopbar({ route, setRoute, dark, setDark }) {
  const nav = [
    { id: 'assistant', label: 'assistant', cmd: '⌘1' },
    { id: 'tickets', label: 'tickets', cmd: '⌘2', badge: 3 },
    { id: 'github', label: 'github', cmd: '⌘3' },
    { id: 'knowledge', label: 'knowledge', cmd: '⌘4' },
  ];
  return React.createElement('header', { className: 'c-top' },
    React.createElement('div', { className: 'c-top__brand' },
      React.createElement('div', { className: 'c-mark' },
        React.createElement('span', { className: 'c-mark__a' }, '['),
        React.createElement('span', { className: 'c-mark__b' }, 'lx'),
        React.createElement('span', { className: 'c-mark__a' }, ']'),
      ),
      React.createElement('div', { className: 'c-top__name' }, 'lynxview'),
      React.createElement('div', { className: 'c-top__ver' }, 'v2.4 · console'),
    ),
    React.createElement('nav', { className: 'c-top__nav' },
      nav.map(n => React.createElement('button', {
        key: n.id, onClick: () => setRoute(n.id),
        className: `c-tab ${route === n.id ? 'is-on' : ''}`,
      },
        React.createElement('span', { className: 'c-tab__lbl' }, n.label),
        n.badge ? React.createElement('span', { className: 'c-tab__badge' }, n.badge) : null,
        React.createElement('span', { className: 'c-tab__cmd' }, n.cmd),
      ))
    ),
    React.createElement('div', { className: 'c-top__right' },
      React.createElement('button', { className: 'c-cmdk' },
        React.createElement('span', null, '⌕'),
        React.createElement('span', { className: 'c-cmdk__lbl' }, 'rechercher…'),
        React.createElement('span', { className: 'c-cmdk__k' }, '⌘K'),
      ),
      React.createElement('button', { className: 'c-icobtn', onClick: () => setDark(!dark), title: 'theme' }, dark ? '◐' : '◑'),
      React.createElement('div', { className: 'c-user' },
        React.createElement('span', { className: 'c-user__av' }, 'LM'),
        React.createElement('span', null, 'leomarty1'),
      ),
    ),
  );
}

function ConsoleStatusbar() {
  return React.createElement('footer', { className: 'c-status' },
    React.createElement('span', { className: 'c-status__on' },
      React.createElement('span', { className: 'c-status__dot' }),
      ' bridge:online'
    ),
    React.createElement('span', null, 'uptime 03m12s'),
    React.createElement('span', null, '142 req/h'),
    React.createElement('span', null, 'tokens 41.2k/d'),
    React.createElement('div', { className: 'c-status__spacer' }),
    React.createElement('span', null, 'env=prod'),
    React.createElement('span', null, 'region=fr-bayonne'),
    React.createElement('span', null, '↑ retour : esc'),
  );
}

// =================================================================
// ASSISTANT
// =================================================================
function ConsoleAssistant() {
  const [skill, setSkill] = cUseState('diagnostic');
  const [prompt, setPrompt] = cUseState("Une S300X affiche heater fault au démarrage. Pas de fumée. Le client a redémarré 2x. Cause possible et étapes de diagnostic à lui envoyer ?");
  const [phase, setPhase] = cUseState('streaming');
  const stream = useStreamingText(SAMPLE_RESPONSE, { autoStart: true });
  const [hi, setHi] = cUseState('h1');
  const [histFilter, setHistFilter] = cUseState('all');

  cUseEffect(() => {
    if (stream.done && phase === 'streaming') setPhase('result');
  }, [stream.done]);

  const launch = () => { setPhase('streaming'); stream.start(); };

  const filteredHistory = cUseMemo(() => {
    if (histFilter === 'all') return HISTORY;
    if (histFilter === 'fav') return HISTORY.filter(h => h.fav);
    return HISTORY.filter(h => h.tag === histFilter);
  }, [histFilter]);

  return React.createElement('div', { className: 'c-assist' },
    // history rail
    React.createElement('aside', { className: 'c-rail' },
      React.createElement('div', { className: 'c-rail__head' },
        React.createElement('span', { className: 'c-rail__lbl' }, '▾ historique'),
        React.createElement('span', { className: 'c-rail__count' }, HISTORY.length),
      ),
      React.createElement('div', { className: 'c-rail__filters' },
        [
          { id: 'all', label: '*' },
          { id: 'fav', label: '★' },
          { id: 'urgent', label: 'urg' },
          { id: 'client', label: 'cli' },
          { id: 'sav', label: 'sav' },
          { id: 'doc', label: 'doc' },
          { id: 'dev', label: 'dev' },
        ].map(f => React.createElement('button', {
          key: f.id, onClick: () => setHistFilter(f.id),
          className: `c-pill ${histFilter === f.id ? 'is-on' : ''}`,
        }, f.label))
      ),
      React.createElement('div', { className: 'c-rail__list' },
        filteredHistory.map(h => React.createElement('button', {
          key: h.id, onClick: () => setHi(h.id),
          className: `c-hi ${hi === h.id ? 'is-on' : ''}`,
        },
          React.createElement('div', { className: 'c-hi__row1' },
            React.createElement('span', { className: 'c-hi__skill' }, '/' + h.skill),
            React.createElement('span', { className: 'c-hi__when' }, h.date === 'Aujourd\'hui' ? h.time : h.date),
          ),
          React.createElement('div', { className: 'c-hi__title' }, h.title),
          React.createElement('div', { className: 'c-hi__row3' },
            React.createElement('span', { className: `c-tag c-tag--${h.tag}` }, h.tag),
            React.createElement('span', { className: 'c-hi__client' }, h.client),
            h.fav ? React.createElement('span', { className: 'c-hi__fav' }, '★') : null,
          )
        ))
      ),
    ),
    // main pane
    React.createElement('section', { className: 'c-pane' },
      React.createElement('div', { className: 'c-paneHead' },
        React.createElement('div', { className: 'c-paneHead__l' },
          React.createElement('span', { className: 'c-paneHead__lbl' }, 'session'),
          React.createElement('span', { className: 'c-paneHead__id' }, 'sess_a8f2e1'),
          React.createElement('span', { className: 'c-paneHead__sep' }, '·'),
          React.createElement('span', { className: 'c-paneHead__ticket' }, 'ticket T-2841 → Décathlon Lab'),
        ),
        React.createElement('div', { className: 'c-paneHead__r' },
          React.createElement('button', { className: 'c-ibtn' }, '⤓ exporter'),
          React.createElement('button', { className: 'c-ibtn' }, '✦ nouveau'),
        ),
      ),
      React.createElement('div', { className: 'c-thread' },
        phase !== 'idle' && React.createElement('div', { className: 'c-bubble c-bubble--user' },
          React.createElement('span', { className: 'c-bubble__role' }, 'user@leomarty1 ▸'),
          React.createElement('p', null, prompt),
        ),
        phase !== 'idle' && React.createElement('div', { className: 'c-bubble c-bubble--ai' },
          React.createElement('div', { className: 'c-bubble__head' },
            React.createElement('span', { className: 'c-bubble__role' }, 'lynxview ▸'),
            React.createElement('span', { className: 'c-bubble__skill' }, '/diagnostic'),
            phase === 'streaming' && React.createElement('span', { className: 'c-streaming' }, '● streaming'),
            React.createElement('span', { className: 'c-bubble__t' }, '4.2s'),
          ),
          React.createElement('div', { className: 'c-md' },
            renderMarkdown(stream.output),
            phase === 'streaming' && React.createElement('span', { className: 'c-caret' }),
          ),
          React.createElement('div', { className: 'c-bubble__foot' },
            React.createElement('button', { className: 'c-ibtn' }, '⧉ copy'),
            React.createElement('button', { className: 'c-ibtn' }, '✉ send as mail'),
            React.createElement('button', { className: 'c-ibtn' }, '↻ rerun'),
            React.createElement('button', { className: 'c-ibtn' }, '◷ save as CR'),
            React.createElement('span', { className: 'c-bubble__src' },
              '↳ sources: kb#heater-fault · kb#err-codes · #978'
            ),
          ),
        ),
        phase === 'idle' && React.createElement(ConsoleEmpty, { setSkill }),
      ),
      React.createElement(ConsoleComposer, { skill, setSkill, prompt, setPrompt, launch, streaming: stream.streaming }),
    ),
    // context drawer
    React.createElement(ConsoleContext, null),
  );
}

function ConsoleEmpty({ setSkill }) {
  return React.createElement('div', { className: 'c-empty' },
    React.createElement('pre', { className: 'c-ascii' },
`╭───────────────────────────────────╮
│   lynxview · console v2.4         │
│   ready · ${SKILLS.length - 1} skills · bridge=online    │
╰───────────────────────────────────╯`),
    React.createElement('p', { className: 'c-empty__p' }, 'choisis un skill ou décris la situation. ctrl+↵ pour lancer.'),
    React.createElement('div', { className: 'c-empty__grid' },
      SKILLS.slice(1).map(s => React.createElement('button', {
        key: s.id, onClick: () => setSkill(s.id), className: 'c-empty__skill',
      },
        React.createElement('div', { className: 'c-empty__skillTop' },
          React.createElement('span', { className: 'c-empty__skillIcon' }, s.icon),
          React.createElement('span', { className: 'c-empty__skillLbl' }, s.label),
        ),
        React.createElement('div', { className: 'c-empty__skillDesc' }, s.desc),
      )),
    ),
  );
}

function ConsoleComposer({ skill, setSkill, prompt, setPrompt, launch, streaming }) {
  const [open, setOpen] = cUseState(false);
  const current = SKILLS.find(s => s.id === skill);
  return React.createElement('div', { className: 'c-composer' },
    React.createElement('div', { className: 'c-composer__inner' },
      React.createElement('div', { className: 'c-composer__skill', onClick: () => setOpen(!open) },
        React.createElement('span', { className: 'c-composer__prefix' }, '$'),
        React.createElement('span', { className: 'c-composer__cmd' }, current.label),
        React.createElement('span', { className: 'c-composer__chev' }, '⌄'),
        open && React.createElement('div', { className: 'c-skillmenu', onClick: e => e.stopPropagation() },
          SKILLS.map(s => React.createElement('button', {
            key: s.id, onClick: () => { setSkill(s.id); setOpen(false); },
            className: `c-skillmenu__item ${s.id === skill ? 'is-on' : ''}`,
          },
            React.createElement('span', { className: 'c-skillmenu__icon' }, s.icon),
            React.createElement('div', null,
              React.createElement('div', { className: 'c-skillmenu__lbl' }, s.label),
              React.createElement('div', { className: 'c-skillmenu__desc' }, s.desc),
            ),
          )),
        ),
      ),
      React.createElement('textarea', {
        className: 'c-textarea',
        value: prompt, onChange: e => setPrompt(e.target.value),
        placeholder: '> tape ta question, ou colle le mail client…',
        rows: 3,
        onKeyDown: e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) launch(); },
      }),
      React.createElement('button', {
        className: 'c-runbtn', onClick: launch, disabled: streaming,
      },
        streaming ? React.createElement('span', { className: 'c-runbtn__spin' }, '◐') : '▸',
        React.createElement('span', null, streaming ? 'running' : 'run'),
        React.createElement('span', { className: 'c-runbtn__k' }, '⌃↵'),
      ),
    ),
    React.createElement('div', { className: 'c-composer__foot' },
      React.createElement('span', null, 'modèle: claude-sonnet-4.5 · temp:0.4 · tokens:1024'),
      React.createElement('span', { className: 'c-dim' }, '·'),
      React.createElement('span', null, 'attached: ticket T-2841'),
      React.createElement('span', { className: 'c-dim' }, '·'),
      React.createElement('span', null, 'sources: kb + github'),
    ),
  );
}

function ConsoleContext() {
  const t = TICKETS[0];
  const { hovered, onEnter, onLeave } = useHoverPreview();
  return React.createElement('aside', { className: 'c-ctx' },
    React.createElement('div', { className: 'c-ctx__sec' },
      React.createElement('div', { className: 'c-ctx__h' }, '▾ ticket'),
      React.createElement('div', { className: 'c-ctx__kv' },
        React.createElement('div', null, React.createElement('span', null, 'id'), React.createElement('span', { className: 'c-mono' }, t.id)),
        React.createElement('div', null, React.createElement('span', null, 'client'), React.createElement('span', null, t.client)),
        React.createElement('div', null, React.createElement('span', null, 'contact'), React.createElement('span', null, t.contact)),
        React.createElement('div', null, React.createElement('span', null, 'machine'), React.createElement('span', { className: 'c-mono' }, t.machine)),
        React.createElement('div', null, React.createElement('span', null, 'priorité'), React.createElement('span', { className: 'c-prio-p1' }, t.priority)),
        React.createElement('div', null, React.createElement('span', null, 'SLA'), React.createElement('span', { className: 'c-warn' }, t.sla)),
      ),
    ),
    React.createElement('div', { className: 'c-ctx__sec' },
      React.createElement('div', { className: 'c-ctx__h' }, '▾ sources'),
      [
        { icon: 'kb', t: 'heater-fault · checklist 7 points', s: 'reads 248' },
        { icon: 'kb', t: 'codes-erreur · ref complète', s: 'reads 690' },
        { icon: 'gh', t: '#978 · relire tuto calib pompe', s: 'closed · 4h', issue: GITHUB_ISSUES['Done'][0] },
      ].map((s, i) => React.createElement('div', {
        key: i, className: 'c-src',
        onMouseEnter: s.issue ? e => onEnter(s.issue, e) : null, onMouseLeave: onLeave,
      },
        React.createElement('span', { className: 'c-src__icon' }, s.icon),
        React.createElement('div', { className: 'c-src__txt' },
          React.createElement('div', { className: 'c-src__t' }, s.t),
          React.createElement('div', { className: 'c-src__s' }, s.s),
        ),
      ))
    ),
    React.createElement('div', { className: 'c-ctx__sec' },
      React.createElement('div', { className: 'c-ctx__h' }, '▾ suite'),
      React.createElement('button', { className: 'c-nextbtn' }, '↳ /mail-client · envoyer au client'),
      React.createElement('button', { className: 'c-nextbtn' }, '↳ /cr · générer compte-rendu'),
      React.createElement('button', { className: 'c-nextbtn' }, '↳ /github · créer issue'),
    ),
    hovered && React.createElement('div', { className: 'c-hover', style: { left: hovered.x, top: hovered.y } },
      React.createElement(IssueHover, { issue: hovered.issue, theme: 'console' })
    ),
  );
}

// =================================================================
// TICKETS
// =================================================================
function ConsoleTickets() {
  const [filter, setFilter] = cUseState('all');
  const [active, setActive] = cUseState('T-2841');
  const list = filter === 'all' ? TICKETS : TICKETS.filter(t => t.priority === filter || t.state === filter);
  const t = TICKETS.find(x => x.id === active);
  return React.createElement('div', { className: 'c-page' },
    React.createElement('header', { className: 'c-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'c-pagehead__crumb' }, '/ tickets'),
        React.createElement('h1', { className: 'c-pagehead__title' }, 'tickets'),
      ),
      React.createElement('div', { className: 'c-pagehead__stats' },
        React.createElement(CStat, { v: '03', l: 'à traiter', t: 'urg' }),
        React.createElement(CStat, { v: '04', l: 'en cours' }),
        React.createElement(CStat, { v: '01', l: 'devis envoyé' }),
        React.createElement(CStat, { v: '92%', l: 'SLA 30j' }),
      ),
    ),
    React.createElement('div', { className: 'c-tickets' },
      React.createElement('div', { className: 'c-tickets__list' },
        React.createElement('div', { className: 'c-filterRow' },
          [
            { id: 'all', label: '* tout' },
            { id: 'P1', label: 'p1' },
            { id: 'À traiter', label: 'à traiter' },
            { id: 'En cours', label: 'en cours' },
            { id: 'En attente client', label: 'en attente' },
            { id: 'Devis envoyé', label: 'devis' },
          ].map(f => React.createElement('button', {
            key: f.id, onClick: () => setFilter(f.id),
            className: `c-pill ${filter === f.id ? 'is-on' : ''}`,
          }, f.label))
        ),
        React.createElement('div', { className: 'c-ticketHead' },
          React.createElement('span', null, 'id'),
          React.createElement('span', null, 'sujet'),
          React.createElement('span', null, 'client / machine'),
          React.createElement('span', null, 'priorité'),
          React.createElement('span', null, 'état'),
          React.createElement('span', null, 'sla'),
        ),
        list.map(t => React.createElement('button', {
          key: t.id, onClick: () => setActive(t.id),
          className: `c-ticketRow ${t.id === active ? 'is-on' : ''}`,
        },
          React.createElement('span', { className: 'c-mono' }, t.id),
          React.createElement('span', { className: 'c-ticketRow__sub' }, t.subject),
          React.createElement('span', null,
            React.createElement('div', null, t.client),
            React.createElement('div', { className: 'c-dim c-mono c-tiny' }, t.machine),
          ),
          React.createElement('span', null, React.createElement('span', { className: `c-prio c-prio--${t.priority.toLowerCase()}` }, t.priority)),
          React.createElement('span', null, React.createElement('span', { className: `c-stateTag c-stateTag--${slug(t.state)}` }, t.state)),
          React.createElement('span', { className: t.sla.startsWith('4h') ? 'c-warn' : 'c-dim' }, t.sla),
        ))
      ),
      React.createElement('aside', { className: 'c-ticketDetail' },
        React.createElement('div', { className: 'c-ticketDetail__head' },
          React.createElement('span', { className: 'c-mono c-dim' }, t.id),
          React.createElement('span', { className: `c-prio c-prio--${t.priority.toLowerCase()}` }, t.priority),
          React.createElement('span', { className: `c-stateTag c-stateTag--${slug(t.state)}` }, t.state),
        ),
        React.createElement('h2', { className: 'c-ticketDetail__title' }, t.subject),
        React.createElement('div', { className: 'c-ticketDetail__meta' },
          React.createElement('div', null, React.createElement('span', null, 'client'), React.createElement('span', null, t.client)),
          React.createElement('div', null, React.createElement('span', null, 'contact'), React.createElement('span', null, t.contact)),
          React.createElement('div', null, React.createElement('span', null, 'machine'), React.createElement('span', { className: 'c-mono' }, t.machine)),
          React.createElement('div', null, React.createElement('span', null, 'âge'), React.createElement('span', null, t.age)),
          React.createElement('div', null, React.createElement('span', null, 'sla'), React.createElement('span', { className: 'c-warn' }, t.sla)),
        ),
        React.createElement('div', { className: 'c-msg' },
          React.createElement('div', { className: 'c-msg__head' }, `${t.contact} · ${t.channel} · il y a ${t.age}`),
          React.createElement('p', null, "Bonjour, notre S300X affiche \"heater fault\" au démarrage depuis ce matin. On a redémarré 2 fois, même résultat. Pas de fumée mais on n'ose pas insister. Pouvez-vous nous dire quoi vérifier en premier ?"),
        ),
        React.createElement('div', { className: 'c-ticketDetail__cta' },
          React.createElement('button', { className: 'c-btn c-btn--p' }, '✦ répondre avec l\'assistant'),
          React.createElement('button', { className: 'c-btn' }, '↳ ouvrir thread'),
        ),
      ),
    ),
  );
}

function CStat({ v, l, t }) {
  return React.createElement('div', { className: `c-stat ${t ? 'c-stat--' + t : ''}` },
    React.createElement('div', { className: 'c-stat__v' }, v),
    React.createElement('div', { className: 'c-stat__l' }, l),
  );
}

// =================================================================
// GITHUB
// =================================================================
function ConsoleGithub() {
  const { hovered, onEnter, onLeave } = useHoverPreview();
  const cols = Object.keys(GITHUB_ISSUES);
  return React.createElement('div', { className: 'c-page' },
    React.createElement('header', { className: 'c-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'c-pagehead__crumb' }, '/ github / cs_maintenance'),
        React.createElement('h1', { className: 'c-pagehead__title' }, 'board'),
      ),
      React.createElement('div', { className: 'c-pagehead__stats' },
        React.createElement('button', { className: 'c-pill is-on' }, 'assignee:leomarty1'),
        React.createElement('button', { className: 'c-pill' }, '+ filtre'),
        React.createElement('button', { className: 'c-btn c-btn--p' }, '+ new issue'),
      ),
    ),
    React.createElement('div', { className: 'c-board' },
      cols.map(col => React.createElement('div', { key: col, className: 'c-bcol' },
        React.createElement('header', { className: 'c-bcol__head' },
          React.createElement('span', { className: 'c-bcol__title' }, col.toLowerCase()),
          React.createElement('span', { className: 'c-bcol__count' }, GITHUB_ISSUES[col].length),
        ),
        React.createElement('div', { className: 'c-bcol__cards' },
          GITHUB_ISSUES[col].map(it => React.createElement('article', {
            key: it.num, className: 'c-bcard',
            onMouseEnter: e => onEnter(it, e), onMouseLeave: onLeave,
          },
            React.createElement('div', { className: 'c-bcard__head' },
              React.createElement('span', { className: 'c-bcard__num' }, `#${it.num}`),
              React.createElement('span', { className: `c-bcard__prio c-bcard__prio--${it.priority.toLowerCase()}` }, it.priority),
            ),
            React.createElement('div', { className: 'c-bcard__title' }, it.title),
            React.createElement('div', { className: 'c-bcard__labels' },
              it.labels.map((l, i) => React.createElement('span', { key: i, className: 'c-bcard__label' }, l))
            ),
            React.createElement('div', { className: 'c-bcard__foot' },
              React.createElement('span', null, '@' + it.assignee),
              React.createElement('span', null, it.updated),
            ),
          ))
        ),
      ))
    ),
    hovered && React.createElement('div', { className: 'c-hover', style: { left: hovered.x, top: hovered.y } },
      React.createElement(IssueHover, { issue: hovered.issue, theme: 'console' })
    ),
  );
}

// =================================================================
// KNOWLEDGE
// =================================================================
function ConsoleKnowledge() {
  const [cat, setCat] = cUseState('tous');
  const cats = ['tous', ...new Set(KNOWLEDGE.map(k => k.cat))];
  const list = cat === 'tous' ? KNOWLEDGE : KNOWLEDGE.filter(k => k.cat === cat);
  return React.createElement('div', { className: 'c-page' },
    React.createElement('header', { className: 'c-pagehead' },
      React.createElement('div', null,
        React.createElement('div', { className: 'c-pagehead__crumb' }, '/ knowledge'),
        React.createElement('h1', { className: 'c-pagehead__title' }, 'knowledge'),
      ),
      React.createElement('div', { className: 'c-pagehead__stats' },
        React.createElement('input', { className: 'c-search', placeholder: '⌕ procédure, code erreur, machine…' }),
      ),
    ),
    React.createElement('div', { className: 'c-kb' },
      React.createElement('aside', { className: 'c-kb__cats' },
        cats.map(c => React.createElement('button', {
          key: c, onClick: () => setCat(c),
          className: `c-kb__cat ${cat === c ? 'is-on' : ''}`,
        }, c))
      ),
      React.createElement('div', { className: 'c-kb__list' },
        list.map(k => React.createElement('article', { key: k.id, className: 'c-kb__item' },
          React.createElement('div', { className: 'c-kb__row1' },
            React.createElement('span', { className: 'c-kb__cat-tag' }, k.cat),
            React.createElement('span', { className: 'c-dim' }, k.reads + ' reads'),
          ),
          React.createElement('h3', { className: 'c-kb__title' }, k.title),
          React.createElement('div', { className: 'c-dim c-tiny' }, k.updated),
        ))
      ),
    ),
  );
}

window.Console = Console;

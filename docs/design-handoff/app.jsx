// Top-level app — switches between Variant A (Atelier) and Variant B (Console)

const { useState: appUseState, useEffect: appUseEffect } = React;

function App() {
  const [variant, setVariant] = appUseState('atelier');
  const [dark, setDark] = appUseState(false);

  // dark default for console
  appUseEffect(() => {
    if (variant === 'console') setDark(true);
    else setDark(false);
  }, [variant]);

  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'shell__bar' },
      React.createElement('div', { className: 'shell__title' },
        React.createElement('span', { className: 'yellowdot' }),
        React.createElement('strong', null, 'LYNXVIEW · REDESIGN'),
        React.createElement('span', { style: { color: 'var(--lx-gray-600)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em', textTransform: 'none', fontWeight: 400 } }, 'make it smarter'),
      ),
      React.createElement('div', { className: 'shell__switcher' },
        React.createElement('button', { className: variant === 'atelier' ? 'is-on' : '', onClick: () => setVariant('atelier') }, 'A · Atelier'),
        React.createElement('button', { className: variant === 'console' ? 'is-on' : '', onClick: () => setVariant('console') }, 'B · Console'),
      ),
      React.createElement('div', { className: 'shell__meta' },
        React.createElement('span', null, React.createElement('span', { className: 'dot' }), ' bridge online · 142 req/h'),
        React.createElement('button', {
          onClick: () => setDark(!dark),
          style: { background: 'transparent', border: '1px solid var(--lx-gray-100)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--lx-gray-600)', fontFamily: 'inherit', fontSize: 11 }
        }, dark ? '☀ light' : '☾ dark'),
      ),
    ),
    React.createElement('div', { className: 'shell__view' },
      variant === 'atelier'
        ? React.createElement(Atelier, { dark, setDark })
        : React.createElement(Console, { dark, setDark }),
    ),
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));

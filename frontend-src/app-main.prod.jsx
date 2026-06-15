// app-main.prod.jsx — [integration] production root.
// Renders the doorstep when the URL resolves to a known property; otherwise a
// graceful "not set up" notice. Property selection happens in app-data.jsx at
// load (window.PROPERTY / window.GREETING); this file just branches on it.
const { useState: useStateA, useEffect: useEffectA } = React;

const DESIGN = {
  accent: '#b85c38',         // terracotta — from the design session
  buttonLayout: 'stacked',
};

// Shown for /ds/* paths that don't match a registered property.
function NotConfigured() {
  useEffectA(() => {
    document.documentElement.style.setProperty('--accent', DESIGN.accent);
  }, []);
  return (
    <div className="fd-app">
      <div className="fd-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-deep, #8a4226)', marginBottom: 12 }}>sabia.casa</div>
          <h1 style={{ fontSize: 24, lineHeight: 1.25, margin: '0 0 12px' }}>This doorstep isn’t set up yet</h1>
          <p style={{ color: 'var(--ink-soft, #5b5147)', lineHeight: 1.55 }}>
            We couldn’t find a home at this address. Check the link, or head to{' '}
            <a href="/" style={{ color: 'var(--accent-deep, #8a4226)', fontWeight: 600 }}>sabia.casa</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useStateA('landing'); // landing | message | offer
  const [focusFacts, setFocusFacts] = useStateA(false);

  useEffectA(() => {
    document.documentElement.style.setProperty('--accent', DESIGN.accent);
  }, []);

  const go = (s, opts = {}) => { setFocusFacts(!!opts.focusFacts); setScreen(s); };

  return (
    <div className="fd-app">
      {screen === 'landing' && (
        <Landing
          greeting={GREETING}
          buttonLayout={DESIGN.buttonLayout}
          focusFacts={focusFacts}
          onMessage={() => go('message')}
          onOffer={() => go('offer')} />
      )}
      {screen === 'message' && <FlowMessage onBack={() => go('landing')} />}
      {screen === 'offer' && (
        <FlowOffer
          onBack={() => go('landing')}
          onViewFacts={() => go('landing', { focusFacts: true })} />
      )}
    </div>
  );
}

const Root = window.PROPERTY ? App : NotConfigured;
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);

// app-main.prod.jsx — [integration] production root.
// Same App as the design session's app-main.jsx, minus the preview chrome
// (Stage backdrop, IOSDevice frame, TweaksPanel). The session's chosen tweak
// values are baked in below; change them here, rebuild, redeploy.
const { useState: useStateA, useEffect: useEffectA } = React;

const DESIGN = {
  accent: '#b85c38',      // terracotta — from the session's tweak defaults
  greetingTone: 'warm',   // warm | brief | playful  (see GREETINGS in app-data.jsx)
  buttonLayout: 'stacked',
};

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
          greeting={GREETINGS[DESIGN.greetingTone] || GREETINGS.warm}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

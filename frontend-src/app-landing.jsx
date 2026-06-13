// app-landing.jsx — the front door (landing screen).
function Landing({ greeting, buttonLayout, onMessage, onOffer, focusFacts }) {
  const scrollRef = React.useRef(null);
  const factsRef = React.useRef(null);
  React.useEffect(() => {
    if (focusFacts && scrollRef.current && factsRef.current) {
      const t = setTimeout(() => {
        scrollRef.current.scrollTo({ top: factsRef.current.offsetTop - 60, behavior: 'smooth' });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [focusFacts]);
  return (
    <div ref={scrollRef} className="fd-scroll fd-fadein" style={{ padding: '56px 18px 40px' }}>

      {/* identity mark */}
      <header style={{ display:'flex', alignItems:'center', gap:13 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flex:'0 0 auto',
          background: 'var(--ink-btn)', color: 'var(--accent)',
          display:'grid', placeItems:'center', boxShadow:'var(--shadow)',
        }}>
          <Ico.house width="24" height="24" />
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing:'-0.02em', lineHeight: 1.1, whiteSpace:'nowrap' }}>{HOUSE.name}</div>
          <div className="fd-eyebrow" style={{ marginTop: 3 }}>{HOUSE.place}</div>
        </div>
      </header>

      {/* greeting */}
      <section style={{ marginTop: 22 }}>
        <div className="fd-eyebrow" style={{ marginBottom: 10 }}>· Welcome ·</div>
        <p className="fd-lead">{greeting}</p>
      </section>

      {/* signature line — the house speaks */}
      <div style={{
        display:'flex', gap:9, alignItems:'center', marginTop: 16, marginBottom: 22,
        padding: '11px 13px', background:'var(--card-2)', borderRadius: 12, border:'1px solid var(--line)',
      }}>
        <span style={{ color:'var(--ink-3)', flex:'0 0 auto' }}><Ico.lock /></span>
        <span className="fd-mono" style={{ fontSize: 12.5, color:'var(--ink-2)', lineHeight: 1.35 }}>{HOUSE.signature}</span>
      </div>

      {/* the two actions — the hierarchy of the page */}
      <div className={'fd-actions ' + (buttonLayout === 'side-by-side' ? 'side' : 'stacked')}>
        <button type="button" className="fd-action is-message" onClick={onMessage}>
          <span className="ico"><Ico.envelope /></span>
          <span style={{ minWidth: 0 }}>
            <span className="ttl" style={{ display:'block' }}>Leave a message</span>
            <span className="sub" style={{ display:'block' }}>For the family or one of us</span>
          </span>
          <span className="arr"><Ico.arrow /></span>
        </button>

        <button type="button" className="fd-action is-offer" onClick={onOffer}>
          <span className="ico"><Ico.tag /></span>
          <span style={{ minWidth: 0 }}>
            <span className="ttl" style={{ display:'block' }}>Make an offer</span>
            <span className="sub" style={{ display:'block' }}>Pitch a service to the house</span>
          </span>
          <span className="arr"><Ico.arrow /></span>
        </button>
      </div>

      {/* secondary, quiet, browsable */}
      <div ref={factsRef} style={{ marginTop: 26, display:'flex', flexDirection:'column', gap: 12 }}>
        <div className="fd-eyebrow" style={{ paddingLeft: 2 }}>About this house</div>

        <Collapsible icon={<Ico.house />} title="House fact sheet"
          subtitle="Public details, so you can quote accurately" defaultOpen={focusFacts}>
          <p className="fd-small" style={{ margin:'2px 0 12px' }}>
            Assessor-class facts plus a few quote-enabling details. Nothing security-related is published here.
          </p>
          <div>
            {FACTS.map((f) => (
              <div key={f.field} className="fd-fact">
                <span className="fl">{f.label}<span className="fld">{f.field}</span></span>
                <span className="fv">{f.value}</span>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible icon={<Ico.list />} title="What we’re looking for"
          subtitle="Standing interests — no rush on any">
          <p className="fd-small" style={{ margin:'2px 0 12px' }}>
            Good offers are welcome anytime, even if it’s not listed.
          </p>
          <div>
            {NEEDS.map((n) => (
              <div key={n.label} className="fd-need">
                <span className="dot" />
                <span>
                  <span className="nl" style={{ display:'block' }}>{n.label}</span>
                  <span className="nn" style={{ display:'block' }}>{n.note}</span>
                </span>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>

      {/* footer */}
      <footer style={{ marginTop: 26, textAlign:'center' }}>
        <div className="fd-small" style={{ lineHeight: 1.5 }}>
          No accounts. No logins.<br/>Messages go straight to the family.
        </div>
        <div className="fd-mono" style={{ fontSize: 11, color:'var(--ink-3)', marginTop: 10, letterSpacing:'.06em' }}>
          SMART HOUSE OS · DOORSTEP v2
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { Landing });

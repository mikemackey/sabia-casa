// app-flow-message.jsx — Flow A: leave a message (friends/neighbors/visitors).
const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;

function FlowMessage({ onBack }) {
  const [recipient, setRecipient] = useStateM('household');
  const [message, setMessage] = useStateM('');
  const [photo, setPhoto] = useStateM(null);
  const [name, setName] = useStateM('');
  const [contact, setContact] = useStateM('');
  const [hp, setHp] = useStateM(''); // honeypot
  const [submitted, setSubmitted] = useStateM(false);
  const [sent, setSent] = useStateM(false);
  const [tooFast, setTooFast] = useStateM(false);
  const [sending, setSending] = useStateM(false);     // [integration]
  const [serverErr, setServerErr] = useStateM('');    // [integration]
  const mounted = useRefM(Date.now());
  const topRef = useRefM(null);

  const errors = {
    message: submitted && !message.trim() ? 'Add a short note so we know what’s up.' : '',
    name: submitted && !name.trim() ? 'We just need a name to know who stopped by.' : '',
  };
  const valid = message.trim() && name.trim();

  // [integration] real submission via app-api.jsx
  async function submit() {
    setSubmitted(true);
    setServerErr('');
    if (!message.trim() || !name.trim()) return;
    if (hp) { setSent(true); return; }              // honeypot tripped → swallow
    if (Date.now() - mounted.current < 3000) {       // min time-on-page
      setTooFast(true);
      setTimeout(() => setTooFast(false), 2200);
      return;
    }
    const recName = RECIPIENTS.find(r => r.id === recipient).label;
    setSending(true);
    const res = await submitMessage({
      recipientLabel: recName, message, senderName: name, contact, photo, hp,
    });
    setSending(false);
    if (!res.ok) { setServerErr(res.error); return; }
    setSent(true);
    if (topRef.current) topRef.current.scrollTop = 0;
  }

  if (sent) {
    const recName = RECIPIENTS.find(r => r.id === recipient).label;
    return (
      <div ref={topRef} className="fd-scroll fd-fadein" style={{ padding: '70px 18px 30px' }}>
        <div style={{ textAlign:'center', paddingTop: 26 }}>
          <div className="fd-seal" style={{ background:'var(--accent-soft)', color:'var(--accent-deep)', margin:'0 auto' }}>
            <Ico.checkBig />
          </div>
          <h1 className="fd-h1" style={{ marginTop: 20 }}>Delivered.</h1>
          <p className="fd-body" style={{ marginTop: 12, maxWidth: 300, marginInline:'auto' }}>
            Your note is on its way to <strong style={{ color:'var(--ink)' }}>{recName === 'The household' ? 'the household' : recName}</strong>. Mike and Tanya get a ping right away.
          </p>
          <p className="fd-small" style={{ marginTop: 14, maxWidth: 300, marginInline:'auto', lineHeight:1.5 }}>
            {contact.trim()
              ? 'You left contact info — if a reply is needed, you’ll hear back.'
              : 'No contact left, so this one’s one-way. That’s perfectly fine.'}
          </p>
        </div>
        <div style={{ marginTop: 30 }}>
          <button className="fd-btn ghost" onClick={onBack}>Back to the front door</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="fd-scroll" style={{ padding: '60px 18px 34px' }}>
      <BackBar onBack={onBack} />
      <div className="fd-fadein">
        <div className="fd-eyebrow" style={{ marginTop: 6 }}>Leave a message</div>
        <h1 className="fd-h1" style={{ marginTop: 8 }}>Drop us a note</h1>
        <p className="fd-body" style={{ marginTop: 8, marginBottom: 22 }}>
          Stopped by and no one answered? Tell us what’s up — takes under a minute.
        </p>

        <Field label="Who’s this for?">
          <RecipientPicker options={RECIPIENTS} value={recipient} onChange={setRecipient} />
        </Field>

        <Field label="Your message" required id="m-msg" error={errors.message}
          hint="Up to 500 characters. e.g. “Your gate was open,” “package behind the planter,” “stopped by — give me a call.”">
          <TextArea id="m-msg" value={message} onChange={setMessage} maxLength={500}
            placeholder="Write your note…" error={!!errors.message} />
        </Field>

        <Field label="Photo" optional id="m-photo">
          <PhotoUpload value={photo} onChange={setPhoto} />
        </Field>

        <Field label="Your name" required id="m-name" error={errors.name}>
          <TextInput id="m-name" value={name} onChange={setName} placeholder="So we know who stopped by" error={!!errors.name} />
        </Field>

        <Field label="Contact" optional id="m-contact"
          hint="Phone or email — only if you’d like a reply.">
          <TextInput id="m-contact" value={contact} onChange={setContact} placeholder="Phone or email" inputMode="email" />
        </Field>

        {/* honeypot — visually hidden, off-screen */}
        <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e)=>setHp(e.target.value)}
          aria-hidden="true" style={{ position:'absolute', left:'-9999px', width:1, height:1, opacity:0 }} />

        <div style={{ marginTop: 8 }}>
          <button className="fd-btn primary" disabled={(submitted && !valid) || sending} onClick={submit}>
            <Ico.envelope width="20" height="20" /> {sending ? 'Sending…' : 'Send message'}
          </button>
          {tooFast && <div className="fd-small" style={{ textAlign:'center', marginTop:10, color:'var(--accent-deep)' }}>One sec — just making sure you’re human…</div>}
          {serverErr && <div className="fd-errmsg" style={{ textAlign:'center', marginTop:10 }}>{serverErr}</div>}
          <p className="fd-small" style={{ textAlign:'center', marginTop: 12, lineHeight:1.5 }}>
            Goes straight to Mike & Tanya. No account, no sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FlowMessage });

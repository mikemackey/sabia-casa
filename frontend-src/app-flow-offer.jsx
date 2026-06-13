// app-flow-offer.jsx — Flow B: make an offer (vendor proposal intake).
const { useState: useStateO, useRef: useRefO } = React;

function FlowOffer({ onBack, onViewFacts }) {
  const [step, setStep] = useStateO(0);
  const [tried, setTried] = useStateO(false);
  const [sent, setSent] = useStateO(false);
  const [ref, setRef] = useStateO('');               // [integration] server-issued
  const [sending, setSending] = useStateO(false);    // [integration]
  const [serverErr, setServerErr] = useStateO('');   // [integration]
  const topRef = useRefO(null);

  // step 1 — who you are
  const [name, setName] = useStateO('');
  const [independent, setIndependent] = useStateO(false);
  const [company, setCompany] = useStateO('');
  const [phone, setPhone] = useStateO('');
  const [email, setEmail] = useStateO('');
  // step 2 — what you're offering
  const [category, setCategory] = useStateO('');
  const [desc, setDesc] = useStateO('');
  const [engagement, setEngagement] = useStateO('');
  // step 3 — details (optional)
  const [moreOpen, setMoreOpen] = useStateO(false);
  const [price, setPrice] = useStateO('');
  const [roc, setRoc] = useStateO('');
  const [web, setWeb] = useStateO('');
  const [photo, setPhoto] = useStateO(null);
  const [referral, setReferral] = useStateO('');
  const [consent, setConsent] = useStateO('');
  const [hp, setHp] = useStateO('');

  const showRoc = ROC_TRADES.has(category);

  const e0 = {
    name: tried && !name.trim() ? 'Required.' : '',
    contact: tried && !phone.trim() && !email.trim() ? 'Add a phone or email — at least one.' : '',
  };
  const e1 = {
    category: tried && !category ? 'Pick the closest category.' : '',
    desc: tried && !desc.trim() ? 'A sentence or two on what you’re offering.' : '',
    engagement: tried && !engagement ? 'Choose one.' : '',
  };

  const valid0 = name.trim() && (phone.trim() || email.trim());
  const valid1 = category && desc.trim() && engagement;

  function next() {
    setTried(true);
    if (step === 0 && !valid0) return;
    if (step === 1 && !valid1) return;
    setTried(false);
    setStep(s => s + 1);
    if (topRef.current) topRef.current.scrollTop = 0;
  }
  function back() {
    if (step === 0) { onBack(); return; }
    setStep(s => s - 1);
    setTried(false);
    if (topRef.current) topRef.current.scrollTop = 0;
  }
  // [integration] real submission via app-api.jsx; ref comes from the server
  async function submit() {
    setTried(true);
    setServerErr('');
    if (!consent) return;
    if (hp) { setRef('QC-0000'); setSent(true); return; } // honeypot → swallow
    setSending(true);
    const res = await submitProposal({
      name, independent, company, phone, email,
      category, desc, engagement,
      price, roc, web, photo, referral, showRoc, hp,
    });
    setSending(false);
    if (!res.ok) { setServerErr(res.error); return; }
    setRef(res.ref || '');
    setSent(true);
    if (topRef.current) topRef.current.scrollTop = 0;
  }

  /* ---------- confirmation ---------- */
  if (sent) {
    return (
      <div ref={topRef} className="fd-scroll fd-fadein" style={{ padding: '70px 18px 30px' }}>
        <div style={{ textAlign:'center', paddingTop: 22 }}>
          <div className="fd-seal" style={{ background:'var(--ink-btn)', color:'var(--accent)', margin:'0 auto' }}>
            <Ico.checkBig />
          </div>
          <h1 className="fd-h1" style={{ marginTop: 20 }}>Offer received</h1>
          <div className="fd-receipt" style={{ marginTop: 16 }}>
            <span style={{ color:'var(--ink-3)' }}>REF</span>
            <strong style={{ color:'var(--ink)' }}>{ref}</strong>
          </div>
          <p className="fd-body" style={{ marginTop: 18, maxWidth: 320, marginInline:'auto', textAlign:'left' }}>
            Every submission is reviewed. If your offer matches a current or future need, we’ll reach out.
          </p>
          <p className="fd-small" style={{ marginTop: 12, maxWidth: 320, marginInline:'auto', textAlign:'left', lineHeight:1.5 }}>
            No response means no current need — you’re welcome to send an updated offer later. Hang on to your reference number.
          </p>
        </div>
        <div style={{ marginTop: 28 }}>
          <button className="fd-btn ghost" onClick={onBack}>Back to the front door</button>
        </div>
      </div>
    );
  }

  const titles = ['Who you are', 'What you’re offering', 'Details that help'];

  return (
    <div ref={topRef} className="fd-scroll" style={{ padding: '60px 18px 34px' }}>
      <BackBar onBack={back} label={step === 0 ? 'Front door' : 'Back'} />
      <div className="fd-fadein" key={step}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 6, marginBottom: 12 }}>
          <div className="fd-eyebrow">Make an offer</div>
          <div className="fd-mono" style={{ fontSize: 12, color:'var(--ink-3)' }}>Step {step+1} of 3</div>
        </div>
        <Steps total={3} current={step} />
        <h1 className="fd-h1" style={{ marginTop: 16, marginBottom: 20 }}>{titles[step]}</h1>

        {/* STEP 1 */}
        {step === 0 && (
          <div>
            <Field label="Your name" required id="o-name" error={e0.name}>
              <TextInput id="o-name" value={name} onChange={setName} placeholder="First and last" error={!!e0.name} />
            </Field>

            <Field label="Company">
              <label className="fd-consent" style={{ marginBottom: independent ? 0 : 10 }}
                onClick={() => setIndependent(v => !v)}>
                <span className={'box'} style={ independent ? { background:'var(--accent)', borderColor:'var(--accent)', color:'#fff' } : null }>
                  {independent && <Ico.check />}
                </span>
                <span className="ctxt">I’m independent — no company name</span>
              </label>
              {!independent && (
                <div style={{ marginTop: 10 }}>
                  <TextInput id="o-co" value={company} onChange={setCompany} placeholder="Business name" />
                </div>
              )}
            </Field>

            <Field label="How to reach you" required error={e0.contact}
              hint="At least one — phone or email.">
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <TextInput id="o-phone" value={phone} onChange={setPhone} placeholder="Phone" type="tel" inputMode="tel" error={!!e0.contact} />
                <TextInput id="o-email" value={email} onChange={setEmail} placeholder="Email" inputMode="email" error={!!e0.contact} />
              </div>
            </Field>
          </div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div>
            <Field label="Category" required id="o-cat" error={e1.category}
              hint="Maps your offer into the home’s service inventory.">
              <SelectInput id="o-cat" value={category} onChange={setCategory} options={CATEGORIES}
                placeholder="Choose a category" error={!!e1.category} />
            </Field>

            <Field label="What you’re offering" required id="o-desc" error={e1.desc}>
              <TextArea id="o-desc" value={desc} onChange={setDesc} maxLength={400}
                placeholder="2–3 sentences: what it is, the scope, and why it’s worth considering."
                error={!!e1.desc} />
            </Field>

            <Field label="Engagement type" required error={e1.engagement}>
              <Pills options={ENGAGEMENTS} value={engagement} onChange={setEngagement} />
            </Field>

            <div className="fd-nudge" style={{ marginTop: 6 }}>
              <span className="ni"><Ico.info /></span>
              <span className="nt">
                <strong>Quote smarter.</strong> This house publishes its facts and current needs —{' '}
                <a onClick={onViewFacts}>see house details</a> to tailor your offer.
              </span>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div>
            <p className="fd-body" style={{ marginTop: -6, marginBottom: 16 }}>
              All optional — but specifics make a stronger case. Skip anything that doesn’t apply.
            </p>

            <button type="button" className={'fd-coll-head' + (moreOpen ? ' open' : '')}
              style={{ border:'1px solid var(--line)', borderRadius: 'var(--radius)', background:'var(--card)', boxShadow:'var(--shadow)', marginBottom: 16 }}
              aria-expanded={moreOpen} onClick={() => setMoreOpen(o=>!o)}>
              <span className="ci"><Ico.list /></span>
              <span>
                <span className="ct" style={{ display:'block' }}>Add supporting details</span>
                <span className="cs" style={{ display:'block' }}>Pricing, license, website, photo</span>
              </span>
              <span className="cx"><Ico.chevDown /></span>
            </button>

            {moreOpen && (
              <div className="fd-fadein">
                <Field label="Ballpark pricing" optional id="o-price"
                  hint="A range is fine — sets expectations.">
                  <TextInput id="o-price" value={price} onChange={setPrice} placeholder="e.g. $120/visit, or $2–4k installed" />
                </Field>

                {showRoc && (
                  <Field label="AZ ROC license #" optional id="o-roc"
                    hint={`Shown because “${category}” is a contracting trade. Builds trust fast.`}>
                    <TextInput id="o-roc" value={roc} onChange={setRoc} placeholder="ROC #######" inputMode="numeric" />
                  </Field>
                )}

                <Field label="Website or Google listing" optional id="o-web">
                  <TextInput id="o-web" value={web} onChange={setWeb} placeholder="example.com" inputMode="url" />
                </Field>

                <Field label="Flyer, card, or work examples" optional id="o-photo">
                  <PhotoUpload value={photo} onChange={setPhoto} title="Attach a photo" sub="Flyer, business card, or work samples" />
                </Field>

                <Field label="How did you come to this house?" optional>
                  <Pills options={REFERRALS} value={referral} onChange={setReferral} />
                </Field>
              </div>
            )}

            {/* honeypot */}
            <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e)=>setHp(e.target.value)}
              aria-hidden="true" style={{ position:'absolute', left:'-9999px', width:1, height:1, opacity:0 }} />

            <label className={'fd-consent' + (consent ? ' on' : '')} style={{ marginTop: 4 }}
              onClick={() => setConsent(v => !v)}>
              <span className="box">{consent && <Ico.check />}</span>
              <span className="ctxt">I understand this household stores my submission to evaluate the offer and may contact me.</span>
            </label>
            {tried && !consent && <div className="fd-errmsg" style={{ marginTop: 8 }}>Please check the box to submit.</div>}
          </div>
        )}

        {/* nav */}
        <div style={{ marginTop: 22, display:'flex', flexDirection:'column', gap: 10 }}>
          {step < 2
            ? <button className="fd-btn primary" onClick={next}>Continue <Ico.arrow width="20" height="20" /></button>
            : <button className="fd-btn dark" disabled={sending} onClick={submit}>{sending ? 'Sending…' : 'Submit offer'}</button>}
          {step === 2 && serverErr && (
            <div className="fd-errmsg" style={{ textAlign:'center' }}>{serverErr}</div>
          )}
          {step === 2 && (
            <p className="fd-small" style={{ textAlign:'center', lineHeight:1.5 }}>
              ~90 seconds of detail beats a cold knock. Serious offers get a real channel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FlowOffer });

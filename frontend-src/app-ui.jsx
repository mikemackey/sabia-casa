// app-ui.jsx — icons + reusable form/UI primitives (shared via window).
const { useState, useRef, useEffect } = React;

/* ---------- icons (simple line glyphs only) ---------- */
const Ico = {
  envelope: (p={}) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 7l9 6 9-6"/>
    </svg>
  ),
  tag: (p={}) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12.5V4.5A1.5 1.5 0 014.5 3h8l8.5 8.5a1.5 1.5 0 010 2.1l-6.9 6.9a1.5 1.5 0 01-2.1 0L3 12.5z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>
    </svg>
  ),
  house: (p={}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 11l8-6.5L20 11"/><path d="M6 9.6V19h12V9.6"/><path d="M10 19v-4.5h4V19"/>
    </svg>
  ),
  list: (p={}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="17.5" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  camera: (p={}) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8.5A1.5 1.5 0 014.5 7h2l1.3-2h8.4L17.5 7h2A1.5 1.5 0 0121 8.5V18a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V8.5z"/><circle cx="12" cy="13" r="3.4"/>
    </svg>
  ),
  chevDown: (p={}) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 9l7 7 7-7"/>
    </svg>
  ),
  arrow: (p={}) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  ),
  back: (p={}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 6l-6 6 6 6"/>
    </svg>
  ),
  check: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 12.5l5 5 11-11"/>
    </svg>
  ),
  checkBig: (p={}) => (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 12.5l5 5 11-11"/>
    </svg>
  ),
  info: (p={}) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  lock: (p={}) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>
    </svg>
  ),
  eye: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
};

/* ---------- field wrapper ---------- */
function Field({ label, required, optional, hint, error, children, id }) {
  return (
    <div className="fd-field">
      {label && (
        <label className="fd-label" htmlFor={id}>
          {label}{required && <span className="fd-req"> *</span>}{optional && <span className="fd-opt">  optional</span>}
        </label>
      )}
      {children}
      {error ? <div className="fd-errmsg">{error}</div> : (hint && <div className="fd-hint">{hint}</div>)}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder, type='text', error, inputMode }) {
  return (
    <input id={id} className={'fd-input' + (error ? ' err' : '')} type={type} inputMode={inputMode}
      value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} autoComplete="off" />
  );
}

function TextArea({ id, value, onChange, placeholder, maxLength, error }) {
  return (
    <div>
      <textarea id={id} className={'fd-textarea' + (error ? ' err' : '')} value={value} placeholder={placeholder}
        maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      {maxLength && <span className="fd-char">{(value || '').length}/{maxLength}</span>}
    </div>
  );
}

function SelectInput({ id, value, onChange, options, placeholder, error }) {
  return (
    <div className="fd-select-wrap">
      <select id={id} className={'fd-select' + (error ? ' err' : '')} value={value}
        onChange={(e) => onChange(e.target.value)} style={!value ? { color: 'var(--ink-3)' } : null}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="chev"><Ico.chevDown /></span>
    </div>
  );
}

/* ---------- recipient / single-select list ---------- */
function RecipientPicker({ options, value, onChange }) {
  return (
    <div className="fd-seg" role="radiogroup">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on}
            className={'fd-seg-item' + (on ? ' on' : '')} onClick={() => onChange(o.id)}>
            <span className="rad" />
            <span>
              <span className="nm">{o.label}</span>
              <span className="sb">{o.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- pill single-select ---------- */
function Pills({ options, value, onChange }) {
  return (
    <div className="fd-pills">
      {options.map((o) => (
        <button key={o} type="button" className={'fd-pill' + (value === o ? ' on' : '')}
          aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

/* ---------- photo upload ---------- */
/* [integration] value is now the File object itself (was: file name string),
   so the photo can be uploaded for real. Visuals unchanged. */
function PhotoUpload({ value, onChange, title='Add a photo', sub='A package, something you noticed' }) {
  const ref = useRef(null);
  const filled = !!value;
  return (
    <>
      <button type="button" className={'fd-photo' + (filled ? ' filled' : '')} onClick={() => ref.current && ref.current.click()}>
        <span className="pico">{filled ? <Ico.check /> : <Ico.camera />}</span>
        <span style={{ minWidth: 0 }}>
          <span className="pt" style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{filled ? value.name : title}</span>
          <span className="ps">{filled ? 'Tap to replace · attached' : sub}</span>
        </span>
        {filled && <span className="fd-btn link" style={{ marginLeft:'auto', color:'var(--accent-deep)' }}
          onClick={(e)=>{ e.stopPropagation(); onChange(null); if (ref.current) ref.current.value=''; }}>Remove</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }}
        onChange={(e)=>{ const f=e.target.files && e.target.files[0]; if(f) onChange(f); }} />
    </>
  );
}

/* ---------- collapsible ---------- */
function Collapsible({ icon, title, subtitle, defaultOpen=false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="fd-card">
      <button type="button" className={'fd-coll-head' + (open ? ' open' : '')} aria-expanded={open} onClick={() => setOpen(o=>!o)}>
        <span className="ci">{icon}</span>
        <span>
          <span className="ct" style={{ display:'block' }}>{title}</span>
          {subtitle && <span className="cs" style={{ display:'block' }}>{subtitle}</span>}
        </span>
        <span className="cx"><Ico.chevDown /></span>
      </button>
      {open && <div className="fd-coll-body fd-fadein">{children}</div>}
    </div>
  );
}

/* ---------- back bar ---------- */
function BackBar({ onBack, label='Front door' }) {
  return (
    <button type="button" className="fd-back" onClick={onBack}>
      <Ico.back /> {label}
    </button>
  );
}

/* ---------- step progress ---------- */
function Steps({ total, current }) {
  return (
    <div className="fd-steps" aria-label={`Step ${current+1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => <div key={i} className={'sd' + (i <= current ? ' on' : '')} />)}
    </div>
  );
}

Object.assign(window, {
  Ico, Field, TextInput, TextArea, SelectInput, RecipientPicker, Pills, PhotoUpload, Collapsible, BackBar, Steps,
});

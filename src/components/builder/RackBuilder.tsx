import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEVICES, DEVICE_GROUPS, PRESETS, DEFAULT_INPUT, recommend, fitOut, arrange, sizeOptions, variantsAt, moveToken, idAt,
  encodeInput, decodeInput, type BuilderInput, type Placement, type Placed, type DeviceType,
} from '../../lib/builder';
import { bySku, formatRRP, productUrl, usableDepth, type Rack } from '../../lib/catalog';
import { faceThumb, cabinetArt, type FaceKind } from '../../lib/art';
import RackScene, { type View } from './RackScene';
import { url } from '../../lib/url';
import './rack-builder.css';

const PLACEMENTS: { id: Placement; title: string; text: string; icon: ReactNode }[] = [
  { id: 'wall', title: 'Wall', text: '4U to 18U', icon: <><rect x="6" y="7" width="20" height="14" rx="1.5" /><path d="M10 11h12M10 14h12M10 17h12" /></> },
  { id: 'floor', title: 'Floor', text: '18U to 47U', icon: <><rect x="9" y="3" width="14" height="24" rx="1.5" /><path d="M12 7h8M12 10h8M12 13h8M11 27v2M21 27v2" /></> },
  { id: 'compact', title: 'Compact 10"', text: 'Mini racks', icon: <><rect x="10" y="9" width="12" height="13" rx="1.5" /><path d="M13 13h6M13 16h6M13 19h6" /></> },
  { id: 'open', title: 'Open frame', text: 'Frames, brackets', icon: <><path d="M9 4v24M23 4v24M9 6h14M9 26h14M6 28h20" /><path d="M9 11h14M9 15h14" /></> },
];
const VIEWS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'front', label: 'Front', icon: <><rect x="4" y="3" width="12" height="14" rx="1.5" /><path d="M7 7h6M7 10h6M7 13h6" /></> },
  { id: 'side', label: 'Side', icon: <><rect x="3" y="3" width="14" height="14" rx="1.5" /><path d="M7 3v14" /><path d="M7 7h6M7 10h8" /></> },
  { id: 'iso', label: '3D', icon: <path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5ZM3.5 6 10 9.5 16.5 6M10 9.5v8" /> },
];
const Icon = ({ children, size = 20, box = 20 }: { children: ReactNode; size?: number; box?: number }) => (
  <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const money = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const faceOf = (d: DeviceType): [FaceKind, number] => (d.mount === 'shelf' ? ['shelf', 2] : [d.id as FaceKind, d.ru]);
const Thumb = ({ kind, ru }: { kind: FaceKind; ru: number }) => <span className="rb-thumb" dangerouslySetInnerHTML={{ __html: faceThumb(kind, ru) }} />;

export default function RackBuilder() {
  const [input, setInput] = useState<BuilderInput>(DEFAULT_INPUT);
  const [ready, setReady] = useState(false);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('front');
  const [tick, setTick] = useState(0);
  const [turned, setTurned] = useState(false);
  const [doorOpen, setDoorOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [hot, setHot] = useState<{ id?: string; sku?: string; token?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Restore from the URL once, then keep the URL shareable.
  useEffect(() => { const d = decodeInput(location.search); if (d) setInput(d); setReady(true); }, []);
  useEffect(() => { if (ready) history.replaceState(null, '', `?${encodeInput(input)}`); }, [input, ready]);

  const rec = useMemo(() => recommend(input), [input]);
  const rack = rec.rack;
  const lines = useMemo(() => (rack ? fitOut(rack, input, rec.need) : []), [rack, input, rec.need]);
  const isOn = (sku: string, defaultOn: boolean) => (defaultOn ? !disabled.has(sku) : enabledOptional.has(sku));
  const active = lines.filter((l) => !l.optional || isOn(l.sku, l.defaultOn));
  const activeKey = active.map((l) => l.sku).join(',');
  const plan = useMemo(() => (rack ? arrange(rack, input, rec.need, lines, new Set(activeKey.split(','))) : null), [rack, input, rec.need, lines, activeKey]);
  const sizes = useMemo(() => sizeOptions(input), [input]);
  const variants = useMemo(() => (rack ? variantsAt(input, rack.ru) : []), [input, rack]);

  const total = active.reduce((s, l) => s + (bySku.get(l.sku)?.rrp ?? 0) * l.qty, 0);
  const unpriced = active.filter((l) => bySku.get(l.sku)?.rrp == null).length;
  const deviceCount = Object.values(input.devices).reduce((a, b) => a + b, 0);
  const sel = plan?.items.find((i) => i.id === selected) ?? null;
  const ud = rack ? usableDepth(rack) : { mm: null, estimated: true };
  const check = (id: string) => rec.checks.find((c) => c.id === id);
  // A chosen cabinet that happens to be the best fit is simply the best fit.
  const picked = !!input.lockedRack && rec.best?.sku !== rack?.sku;

  const set = (patch: Partial<BuilderInput>) => setInput((i) => ({ ...i, ...patch }));
  const setQty = (id: string, q: number) => set({ devices: { ...input.devices, [id]: Math.max(0, Math.min(40, q)) } });
  const toggle = (sku: string, defaultOn: boolean) => {
    const upd = (s: Set<string>) => { const n = new Set(s); n.has(sku) ? n.delete(sku) : n.add(sku); return n; };
    defaultOn ? setDisabled(upd) : setEnabledOptional(upd);
  };
  const pickRack = (r: Rack) => set({ lockedRack: r.sku === rec.best?.sku ? null : r.sku });
  const chooseView = (v: View) => { setView(v); setTick((t) => t + 1); setTurned(false); setDoorOpen(v === 'front'); };

  function move(it: Placed, to: number) {
    if (!plan) return;
    const next = moveToken(plan.seq, it.seq, to);
    set({ layout: next });
    setSelected(idAt(next, to));
  }
  function step(it: Placed, dir: -1 | 1) {
    if (plan && it.seq + dir >= 0 && it.seq + dir < plan.seq.length) move(it, it.seq + dir);
  }
  function remove(it: Placed) {
    if (it.kind === 'device' && plan) {
      set({ devices: { ...input.devices, [it.token]: Math.max(0, (input.devices[it.token] ?? 0) - 1) }, layout: input.layout ? plan.seq.filter((_, i) => i !== it.seq) : null });
    } else if (it.sku) toggle(it.sku, true);
    setSelected(null);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard unavailable */ }
  }

  const quoteHref = url(`/quote?items=${encodeURIComponent(active.map((l) => `${l.sku}:${l.qty}`).join(','))}&build=${encodeURIComponent(encodeInput(input))}`);
  const isHot = (it: Placed) => !!hot && (hot.id === it.id || (!!hot.sku && hot.sku === it.sku) || (!!hot.token && (hot.token === it.token || (hot.token === 'desktop' && it.token === 'shelf'))));
  const hotId = plan?.items.find(isHot)?.id ?? null;
  const used = rec.need.usedU;

  return (
    <div className="rb">
      <div className="rb-work">
        {/* ---------- Equipment ---------- */}
        <section className="rb-panel rb-equip" aria-label="Your equipment">
          <h2 className="rb-h" id="rb-where">Where is it going?</h2>
          <div className="rb-places" role="radiogroup" aria-labelledby="rb-where">
            {PLACEMENTS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={input.placement === p.id} className="rb-place"
                onClick={() => { set({ placement: p.id, lockedRack: null }); setSelected(null); }}>
                <Icon size={30} box={32}>{p.icon}</Icon>
                <strong>{p.title}</strong><span>{p.text}</span>
              </button>
            ))}
          </div>
          {input.placement === 'floor' && (
            <label className="rb-check"><input type="checkbox" checked={input.quiet} onChange={(e) => set({ quiet: e.target.checked, lockedRack: null })} />
              <span>Noise-sensitive space <small>Office floor, clinic, classroom: use a soundproof cabinet</small></span></label>
          )}
          {input.placement === 'compact' && <p className="rb-note">10" mini racks take 10-inch equipment only. Standard 19" switches and patch panels won't fit.</p>}

          <h2 className="rb-h" id="rb-what">What's going in it?</h2>
          <div className="rb-presets" role="group" aria-label="Start from a typical setup">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="rb-pill" title={p.text}
                onClick={() => { set({ devices: { ...p.devices }, placement: p.placement, lockedRack: null, layout: null }); setSelected(null); }}>{p.label}</button>
            ))}
            <button type="button" className="rb-pill rb-pill--ghost" onClick={() => { set({ devices: {}, layout: null }); setSelected(null); }}>Clear</button>
          </div>

          {DEVICE_GROUPS.map((grp) => (
            <div key={grp.id} className="rb-group">
              <h3>{grp.label}</h3>
              <ul>
                {DEVICES.filter((d) => d.group === grp.id).map((d) => {
                  const q = input.devices[d.id] ?? 0, [kind, ru] = faceOf(d);
                  return (
                    <li key={d.id} className={q ? 'is-on' : ''} data-hot={hot?.token === d.id || (hot?.token === 'shelf' && d.id === 'desktop') || undefined}
                      onPointerEnter={() => q && setHot({ token: d.id })} onPointerLeave={() => setHot(null)}>
                      <Thumb kind={kind} ru={ru} />
                      <div className="rb-dev"><strong>{d.label}</strong><span>{d.hint}</span></div>
                      <div className="rb-stepper" role="group" aria-label={`${d.label} quantity`}>
                        <button type="button" onClick={() => setQty(d.id, q - 1)} disabled={!q} aria-label={`Remove one ${d.label}`}>−</button>
                        <output aria-live="polite">{q}</output>
                        <button type="button" onClick={() => setQty(d.id, q + 1)} aria-label={`Add one ${d.label}`}>+</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        {/* ---------- The rack ---------- */}
        <section className="rb-stage" aria-label="Rack view">
          <div className="rb-bar">
            <div className="rb-seg rb-views" role="radiogroup" aria-label="View">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="radio" aria-checked={view === v.id && !turned} onClick={() => chooseView(v.id)}>
                  <Icon size={18}>{v.icon}</Icon><span>{v.label}</span>
                </button>
              ))}
            </div>
            <div className="rb-tools">
              {input.layout && <button type="button" className="rb-tool" onClick={() => { set({ layout: null }); setSelected(null); }}>Auto-arrange</button>}
              {rack?.door && (
                <button type="button" className="rb-tool" aria-pressed={doorOpen} onClick={() => setDoorOpen((o) => !o)}>
                  <Icon size={18}><rect x="5" y="2.5" width="10" height="15" rx="1" />{doorOpen ? <path d="M5 2.5 10.5 5v10L5 17.5" /> : <circle cx="12.5" cy="10" r=".6" fill="currentColor" />}</Icon>
                  <span>{doorOpen ? 'Close door' : 'Open door'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="rb-canvas">
            {rack && plan && (
              <RackScene rack={rack} items={plan.items} seq={plan.seq} view={view} viewTick={tick} doorOpen={doorOpen} labels={rack.ru <= 18} dims
                selected={selected} hot={hotId} onSelect={setSelected} onHover={(id) => { const it = plan.items.find((i) => i.id === id); setHot(it ? { id: it.id, sku: it.sku, token: it.token } : null); }}
                onMove={move} onStep={step} onRemove={remove} onOrbit={() => setTurned(true)} />
            )}
            {plan && plan.unplaced.length > 0 && (
              <p className="rb-overflow" role="status">
                {plan.unplaced.length} item{plan.unplaced.length > 1 ? 's' : ''} won't fit in this cabinet.
                {rec.best && rec.best.sku !== rack?.sku && <button type="button" onClick={() => set({ lockedRack: null })}>Use the best fit</button>}
              </p>
            )}
          </div>

          <div className="rb-inspect" aria-live="polite">
            {sel && sel.kind === 'free' ? (
              <>
                <div className="rb-insp-title"><strong>{sel.ru}U free</strong><span>Add equipment</span></div>
                <div className="rb-quick">
                  {DEVICES.map((d) => { const [kind, ru] = faceOf(d); return (
                    <button key={d.id} type="button" onClick={() => setQty(d.id, (input.devices[d.id] ?? 0) + 1)}><Thumb kind={kind} ru={ru} /><span>{d.label.replace(/, 24-port| \/ .*|, \dU$/, '')}{d.id.startsWith('server') ? ` ${d.ru}U` : ''}</span></button>
                  ); })}
                </div>
                <button type="button" className="rb-x" onClick={() => setSelected(null)} aria-label="Close">×</button>
              </>
            ) : sel ? (
              <>
                {sel.face && <Thumb kind={sel.face} ru={sel.ru} />}
                <div className="rb-insp-title"><strong>{sel.label}</strong><span>{sel.ru}U · unit{sel.ru > 1 ? `s ${sel.u - sel.ru + 1}–${sel.u}` : ` ${sel.u}`}{sel.ldr ? ' · LDR part' : ' · your equipment'}</span></div>
                <div className="rb-insp-actions">
                  {sel.seq >= 0 && <>
                    <button type="button" className="rb-tool" onClick={() => step(sel, -1)} disabled={sel.seq === 0} aria-label="Move up"><Icon size={18}><path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" /></Icon></button>
                    <button type="button" className="rb-tool" onClick={() => step(sel, 1)} disabled={sel.seq === (plan?.seq.length ?? 0) - 1} aria-label="Move down"><Icon size={18}><path d="M10 5v10M5.5 10.5 10 15l4.5-4.5" /></Icon></button>
                  </>}
                  {sel.kind !== 'shelf' && <button type="button" className="rb-tool rb-tool--danger" onClick={() => remove(sel)}>Remove</button>}
                </div>
                <button type="button" className="rb-x" onClick={() => setSelected(null)} aria-label="Close">×</button>
              </>
            ) : rack ? (
              <>
                <div className="rb-insp-title"><strong>{rack.name}</strong><span>{used}U of {rack.ru}U used{rack.width && rack.depth ? ` · ${rack.width} × ${rack.depth} mm` : ''}</span></div>
                <p className="rb-hint">Drag equipment to rearrange it. Drag the background to turn the cabinet.</p>
              </>
            ) : null}
          </div>
        </section>
      </div>

      {/* ---------- The build ---------- */}
      <aside className="rb-panel rb-build" aria-label="Your build">
        {!rack ? <p className="rb-note">No cabinet is available for this placement.</p> : (
          <>
            <div className="rb-cab">
              <div className="rb-cab-top">
                <span className={`rb-flag ${picked ? '' : 'rb-flag--best'}`}>{picked ? 'Your pick' : deviceCount ? 'Best fit' : 'Smallest cabinet'}</span>
                {picked && rec.best && <button type="button" className="rb-link" onClick={() => set({ lockedRack: null })}>Back to best fit ({rec.best.ru}U)</button>}
              </div>
              <div className="rb-cab-main">
                <a className="rb-cab-img" href={productUrl(rack)} aria-hidden="true" tabIndex={-1}>
                  {rack.image ? <img src={rack.image} alt="" loading="lazy" /> : <span dangerouslySetInnerHTML={{ __html: cabinetArt(rack) }} />}
                </a>
                <div>
                  <h2><a href={productUrl(rack)}>{rack.name}</a></h2>
                  <p className="sku">{rack.sku}</p>
                  <p className="rb-cab-spec">{[rack.width && rack.depth ? `${rack.width} × ${rack.depth} mm` : rack.standard === '10' ? '10-inch' : null, rack.door ? `${rack.door} door` : null, rack.style].filter(Boolean).join(' · ')}</p>
                  <p className="rb-cab-price">{formatRRP(rack) ? <><strong>{formatRRP(rack)}</strong> RRP</> : 'Price on request'}{rack.range === 'carbon' && <span className="badge badge--carbon">Carbon</span>}</p>
                </div>
              </div>

              <div className="rb-sizes" role="radiogroup" aria-label="Cabinet height">
                {sizes.map((o) => (
                  <button key={o.ru} type="button" role="radio" aria-checked={rack.ru === o.ru} className={`rb-size ${o.fits ? '' : 'is-small'} ${rec.best?.ru === o.ru ? 'is-best' : ''}`}
                    title={o.fits ? (rec.best?.ru === o.ru ? 'Best fit' : `${o.ru}U`) : `${o.ru}U is too small or too shallow for this equipment`} onClick={() => pickRack(rec.best?.ru === o.ru ? rec.best : o.rack)}>{o.ru}U</button>
                ))}
              </div>
              {variants.length > 1 && (
                <div className="rb-variants" role="radiogroup" aria-label={`${rack.ru}U cabinets`}>
                  {variants.map((v) => (
                    <button key={v.sku} type="button" role="radio" aria-checked={v.sku === rack.sku} onClick={() => pickRack(v)}>
                      <span className="rb-radio" />
                      <span className="rb-var-name">{v.depth ? `${v.depth} mm deep` : v.name}{v.style && /hinged/i.test(v.style) ? ', hinged' : ''}{/white/i.test(v.colour) ? ', white' : ''}</span>
                      <span className={`badge ${v.range === 'carbon' ? 'badge--carbon' : ''}`}>{v.range === 'carbon' ? 'Carbon' : 'LDR'}</span>
                      <span className="rb-var-price">{formatRRP(v) ?? 'POA'}</span>
                    </button>
                  ))}
                </div>
              )}
              {rec.relaxed.map((r) => <p key={r} className="notice notice--warn">{r}</p>)}
            </div>

            {deviceCount === 0 ? <p className="rb-note">Add equipment on the left, or pick a typical setup, and the builder will size the cabinet around it.</p> : (
              <div className="rb-fit">
                <Meter label="Space" ok={!!check('space')?.ok} value={used} max={rack.ru} mark={Math.min(rec.need.requiredU, rack.ru)}
                  text={`${used}U of ${rack.ru}U`} note={check('space')?.ok ? (check('growth')?.ok ? `${rack.ru - used}U spare${input.growth ? `, covers +${Math.round(input.growth * 100)}% growth` : ''}` : `${rack.ru - used}U spare, under your +${Math.round(input.growth * 100)}% allowance`) : 'Too small for this equipment'} warn={!!check('space')?.ok && !check('growth')?.ok} />
                {rec.need.deepest > 0 && (
                  <Meter label="Depth" ok={!!check('depth')?.ok} value={rec.need.deepest} max={ud.mm ?? rec.need.deepest}
                    text={ud.mm ? `${rec.need.deepest} of ${ud.estimated ? '~' : ''}${ud.mm} mm` : `${rec.need.deepest} mm`}
                    note={ud.mm == null ? 'Usable depth to be confirmed on the datasheet' : check('depth')?.ok ? `Deepest: ${rec.need.deepestFrom?.toLowerCase()}${ud.estimated ? '. Usable depth is an estimate' : ''}` : `${rec.need.deepestFrom} is too deep for this cabinet`} />
                )}
              </div>
            )}

            <details className="rb-prefs">
              <summary>Match settings<span>{[input.growth ? `+${input.growth * 100}% growth` : 'no growth', input.range !== 'any' ? (input.range === 'carbon' ? 'Carbon' : 'LDR') : null, input.door !== 'any' ? `${input.door} door` : null].filter(Boolean).join(' · ')}</span></summary>
              <div className="rb-prefs-body">
                <Seg legend="Spare space for growth" name="grow" value={String(input.growth)} options={[['0', 'None'], ['0.25', '+25%'], ['0.5', '+50%']]} onChange={(v) => set({ growth: +v })} />
                <Seg legend="Range" name="range" value={input.range} options={[['any', 'Either'], ['carbon', 'Carbon'], ['classic', 'LDR']]} onChange={(v) => set({ range: v as BuilderInput['range'], lockedRack: null })} />
                <Seg legend="Front door" name="door" value={input.door} options={[['any', 'Either'], ['glass', 'Glass'], ['mesh', 'Mesh']]} onChange={(v) => set({ door: v as BuilderInput['door'], lockedRack: null })} />
                <div className="field">
                  <label htmlFor="rb-depth">Deepest device</label>
                  <select id="rb-depth" className="select" value={input.depthOverride ?? ''} onChange={(e) => set({ depthOverride: e.target.value ? +e.target.value : null, lockedRack: null })}>
                    <option value="">Work it out from my list{rec.need.deepestFrom && !input.depthOverride ? ` (~${rec.need.deepest} mm)` : ''}</option>
                    {[200, 300, 350, 400, 500, 600, 700, 800, 900].map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </div>
              </div>
            </details>

            <div className="rb-bom">
              <h3>Parts list</h3>
              <ul>
                {lines.map((l) => {
                  const p = bySku.get(l.sku)!;
                  const on = !l.optional || isOn(l.sku, l.defaultOn);
                  return (
                    <li key={l.sku} className={on ? '' : 'off'} data-hot={(on && hot?.sku === l.sku) || undefined}
                      onPointerEnter={() => on && setHot({ sku: l.sku })} onPointerLeave={() => setHot(null)}>
                      {l.optional
                        ? <input type="checkbox" checked={on} onChange={() => toggle(l.sku, l.defaultOn)} aria-label={`Include ${p.name}`} />
                        : <span className="rb-req" title="Required">•</span>}
                      <div>
                        <a href={productUrl(p)}>{p.name}</a>
                        <small><span className="sku">{l.sku}</span> · {l.role}</small>
                      </div>
                      <span className="rb-qty">× {l.qty}</span>
                      <span className="rb-price">{p.rrp != null ? money(p.rrp * l.qty) : 'POA'}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="rb-total"><span>RRP total, inc GST{unpriced ? ` (${unpriced} item${unpriced > 1 ? 's' : ''} priced on request)` : ''}</span><strong>{money(total)}</strong></p>
            </div>

            <div className="rb-actions">
              <a className="btn btn--primary" href={quoteHref}>Request a quote for this build</a>
              <button type="button" className="btn btn--secondary" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
              <button type="button" className="btn btn--secondary" onClick={() => window.print()}>Print</button>
            </div>
            <p className="rb-fine">The builder matches standard LDR cabinets; it doesn't customise them. Device depths are typical values, so check your equipment's datasheet. The drawing is to scale by rack units. Carbon depth figures are estimates until datasheets are published.</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Meter({ label, ok, warn, value, max, mark, text, note }: { label: string; ok: boolean; warn?: boolean; value: number; max: number; mark?: number; text: string; note: string }) {
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / Math.max(max, 1)) * 100))}%`;
  return (
    <div className={`rb-meter ${ok ? (warn ? 'is-warn' : 'is-ok') : 'is-bad'}`}>
      <div className="rb-meter-head"><strong>{label}</strong><span>{text}</span></div>
      <div className="rb-track" role="img" aria-label={`${label}: ${text}. ${note}`}>
        <i style={{ width: pct(value) }} />
        {mark != null && mark > value && <b style={{ left: pct(mark) }} title="With growth allowance" />}
      </div>
      <p><span aria-hidden="true">{ok ? (warn ? '!' : '✓') : '!'}</span>{note}</p>
    </div>
  );
}

function Seg({ legend, name, value, options, onChange }: { legend: string; name: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="rb-seg">
        {options.map(([v, text]) => (
          <label key={v}><input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} /><span>{text}</span></label>
        ))}
      </div>
    </fieldset>
  );
}

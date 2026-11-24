import { useEffect, useMemo, useState } from 'react';
import {
  DEVICES, PRESETS, DEFAULT_INPUT, recommend, fitOut, elevation, encodeInput, decodeInput,
  type BuilderInput, type Placement, type Slot,
} from '../../lib/builder';
import { bySku, formatRRP, productUrl, usableDepth, type Rack } from '../../lib/catalog';
import './rack-builder.css';

const PLACEMENTS: { id: Placement; title: string; text: string }[] = [
  { id: 'wall', title: 'On a wall', text: 'Wall cabinets, 4U–18U' },
  { id: 'floor', title: 'On the floor', text: 'Floor cabinets, 18U–47U' },
  { id: 'compact', title: 'Compact 10"', text: 'Mini racks for 10" gear' },
  { id: 'open', title: 'Open frame', text: 'Brackets and open frames' },
];

export default function RackBuilder() {
  const [input, setInput] = useState<BuilderInput>(DEFAULT_INPUT);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Restore from URL once on load.
  useEffect(() => { const d = decodeInput(location.search); if (d) setInput(d); }, []);
  // Keep the URL shareable.
  useEffect(() => { history.replaceState(null, '', `?${encodeInput(input)}`); }, [input]);

  const rec = useMemo(() => recommend(input), [input]);
  const rack = rec.rack;
  const lines = useMemo(() => (rack ? fitOut(rack, input, rec.need) : []), [rack, input, rec.need]);
  const isOn = (sku: string, defaultOn: boolean) => (defaultOn ? !disabled.has(sku) : enabledOptional.has(sku));
  const active = lines.filter((l) => !l.optional || isOn(l.sku, l.defaultOn));
  const activeSet = new Set(active.map((l) => l.sku));
  const slots = rack ? elevation(rack, input, rec.need, lines, activeSet) : [];

  const total = active.reduce((s, l) => s + (bySku.get(l.sku)?.rrp ?? 0) * l.qty, 0);
  const unpriced = active.filter((l) => bySku.get(l.sku)?.rrp == null).length;

  const set = (patch: Partial<BuilderInput>) => setInput((i) => ({ ...i, ...patch }));
  const setQty = (id: string, q: number) => set({ devices: { ...input.devices, [id]: Math.max(0, Math.min(40, q)) } });
  const toggle = (sku: string, defaultOn: boolean) => {
    const upd = (s: Set<string>) => { const n = new Set(s); n.has(sku) ? n.delete(sku) : n.add(sku); return n; };
    defaultOn ? setDisabled(upd) : setEnabledOptional(upd);
  };
  const deviceCount = Object.values(input.devices).reduce((a, b) => a + b, 0);
  const quoteHref = `/quote?items=${encodeURIComponent(active.map((l) => `${l.sku}:${l.qty}`).join(','))}&build=${encodeURIComponent(encodeInput(input))}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  }

  return (
    <div className="rb">
      <div className="rb-steps">
        {/* Step 1 */}
        <section className="rb-step" aria-labelledby="s1">
          <h2 id="s1"><span>1</span> Where is it going?</h2>
          <div className="rb-options rb-options--4" role="radiogroup" aria-labelledby="s1">
            {PLACEMENTS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={input.placement === p.id}
                className="rb-option" onClick={() => set({ placement: p.id, lockedRack: null })}>
                <strong>{p.title}</strong><span>{p.text}</span>
              </button>
            ))}
          </div>
          {input.placement === 'floor' && (
            <label className="rb-check"><input type="checkbox" checked={input.quiet} onChange={(e) => set({ quiet: e.target.checked, lockedRack: null })} />
              Noise-sensitive space (office floor, clinic, classroom): show soundproof cabinets</label>
          )}
          {input.placement === 'compact' && <p className="rb-hint">10" mini racks take 10-inch equipment only. Standard 19" switches and patch panels won't fit.</p>}
        </section>

        {/* Step 2 */}
        <section className="rb-step" aria-labelledby="s2">
          <h2 id="s2"><span>2</span> What's going in it?</h2>
          <p className="rb-sub">Start from a typical setup, then adjust the quantities.</p>
          <div className="rb-presets">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="rb-preset"
                onClick={() => set({ devices: { ...p.devices }, placement: p.placement, lockedRack: null })}>
                <strong>{p.label}</strong><span>{p.text}</span>
              </button>
            ))}
            <button type="button" className="rb-preset" onClick={() => set({ devices: {}, lockedRack: input.lockedRack })}>
              <strong>Start empty</strong><span>Add each item yourself</span>
            </button>
          </div>
          <ul className="rb-devices">
            {DEVICES.map((d) => {
              const q = input.devices[d.id] ?? 0;
              return (
                <li key={d.id} className={q ? 'is-on' : ''}>
                  <div><strong>{d.label}</strong><span>{d.hint}</span></div>
                  <div className="rb-stepper" role="group" aria-label={`${d.label} quantity`}>
                    <button type="button" onClick={() => setQty(d.id, q - 1)} disabled={!q} aria-label={`Remove one ${d.label}`}>−</button>
                    <output aria-live="polite">{q}</output>
                    <button type="button" onClick={() => setQty(d.id, q + 1)} aria-label={`Add one ${d.label}`}>+</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Step 3 */}
        <section className="rb-step" aria-labelledby="s3">
          <h2 id="s3"><span>3</span> Preferences</h2>
          <div className="rb-prefs">
            <fieldset>
              <legend>Spare space for growth</legend>
              <div className="rb-seg">
                {[0, 0.25, 0.5].map((g) => (
                  <label key={g}><input type="radio" name="grow" checked={input.growth === g} onChange={() => set({ growth: g })} /><span>{g === 0 ? 'None' : `+${g * 100}%`}</span></label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Range</legend>
              <div className="rb-seg">
                {(['any', 'carbon', 'classic'] as const).map((r) => (
                  <label key={r}><input type="radio" name="range" checked={input.range === r} onChange={() => set({ range: r, lockedRack: null })} /><span>{r === 'any' ? 'Either' : r === 'carbon' ? 'Carbon' : 'LDR'}</span></label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Front door</legend>
              <div className="rb-seg">
                {(['any', 'glass', 'mesh'] as const).map((d) => (
                  <label key={d}><input type="radio" name="door" checked={input.door === d} onChange={() => set({ door: d, lockedRack: null })} /><span>{d === 'any' ? 'Either' : d[0].toUpperCase() + d.slice(1)}</span></label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="rb-depth">Deepest device</label>
              <select id="rb-depth" className="select" value={input.depthOverride ?? ''} onChange={(e) => set({ depthOverride: e.target.value ? +e.target.value : null, lockedRack: null })}>
                <option value="">Work it out from my list{rec.need.deepestFrom && !input.depthOverride ? ` (~${rec.need.deepest} mm)` : ''}</option>
                {[200, 300, 350, 400, 500, 600, 700, 800, 900].map((d) => <option key={d} value={d}>{d} mm</option>)}
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Result */}
      <aside className="rb-result" aria-live="polite" aria-label="Your matched rack">
        {!rack || deviceCount === 0 ? (
          <div className="rb-empty">
            <h2>Add some equipment</h2>
            <p>Choose a typical setup or add items in step 2 and we'll match a cabinet.</p>
          </div>
        ) : (
          <>
            <div className="rb-head">
              <span className="eyebrow">{input.lockedRack ? 'Your selected cabinet' : 'Recommended cabinet'}</span>
              <h2><a href={productUrl(rack)}>{rack.name}</a></h2>
              <p className="sku">{rack.sku}{rack.width && rack.depth ? ` · ${rack.width} × ${rack.depth} mm` : ''}{rack.door ? ` · ${rack.door} door` : ''}</p>
              {rack.range === 'carbon' && <span className="badge badge--carbon">Carbon</span>}
            </div>

            {rec.relaxed.map((r) => <p key={r} className="notice notice--warn">{r}</p>)}

            <ul className="rb-checks">
              {rec.checks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : 'bad'}>
                  <span aria-hidden="true">{c.ok ? '✓' : '!'}</span>
                  <div><strong>{c.label}</strong><small>{c.detail}</small></div>
                </li>
              ))}
            </ul>

            {input.lockedRack && <button type="button" className="btn btn--secondary btn--small" onClick={() => set({ lockedRack: null })}>Show the recommended cabinet instead</button>}

            {rec.alternatives.length > 0 && (
              <div className="rb-alts">
                <h3>Alternatives</h3>
                {rec.alternatives.map(({ rack: r, why }) => (
                  <button key={r.sku} type="button" className="rb-alt" onClick={() => set({ lockedRack: r.sku })}>
                    <span><strong>{r.name}</strong><small className="sku">{r.sku}</small></span>
                    <em>{why}</em>
                  </button>
                ))}
              </div>
            )}

            <div className="rb-elev-wrap">
              <h3>Front view</h3>
              <Elevation rack={rack} slots={slots} />
            </div>

            <div className="rb-bom">
              <h3>Parts list</h3>
              <ul>
                {lines.map((l) => {
                  const p = bySku.get(l.sku)!;
                  const on = !l.optional || isOn(l.sku, l.defaultOn);
                  const price = formatRRP(p);
                  return (
                    <li key={l.sku} className={on ? '' : 'off'}>
                      {l.optional
                        ? <input type="checkbox" checked={on} onChange={() => toggle(l.sku, l.defaultOn)} aria-label={`Include ${p.name}`} />
                        : <span className="rb-req" title="Required">•</span>}
                      <div>
                        <a href={productUrl(p)}>{p.name}</a>
                        <small><span className="sku">{l.sku}</span> · {l.role}</small>
                      </div>
                      <span className="rb-qty">× {l.qty}</span>
                      <span className="rb-price">{price ? `$${((p.rrp ?? 0) * l.qty).toLocaleString('en-AU')}` : 'POA'}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="rb-total"><span>RRP total{unpriced ? ` (excl. ${unpriced} item${unpriced > 1 ? 's' : ''} on request)` : ''}</span><strong>${total.toLocaleString('en-AU')}</strong></p>
            </div>

            <div className="rb-actions">
              <a className="btn btn--primary" href={quoteHref}>Request a quote for this build</a>
              <button type="button" className="btn btn--secondary" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
              <button type="button" className="btn btn--secondary" onClick={() => window.print()}>Print</button>
            </div>
            <p className="rb-fine">The builder matches standard LDR cabinets; it doesn't customise them. Device depths are typical values; check your equipment's datasheet. Carbon depth figures are estimates until datasheets are published.</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Elevation({ rack, slots }: { rack: Rack; slots: Slot[] }) {
  const uh = Math.max(10, Math.min(22, 520 / rack.ru));
  const W = 300, rail = 22, top = 10;
  const H = rack.ru * uh + top * 2;
  const ud = usableDepth(rack);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rb-elev" role="img" aria-label={`Front view of ${rack.ru}U cabinet with equipment layout`}>
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="4" className="frame" />
      <rect x={rail} y={top} width={W - rail * 2} height={rack.ru * uh} className="bay" />
      {Array.from({ length: rack.ru }, (_, i) => (
        <g key={i}>
          <text x={rail - 6} y={top + i * uh + uh / 2 + 3} className="unum" textAnchor="end">{rack.ru - i}</text>
          <line x1={rail} x2={W - rail} y1={top + i * uh} y2={top + i * uh} className="uline" />
        </g>
      ))}
      {slots.map((s, i) => {
        const y = top + (rack.ru - s.u) * uh;
        const h = s.height * uh;
        return (
          <g key={i} className={`slot slot--${s.kind}`}>
            <rect x={rail + 2} y={y + 1} width={W - rail * 2 - 4} height={h - 2} rx="2" />
            {h >= 10 && <text x={W / 2} y={y + h / 2 + 4} textAnchor="middle">{s.label}{s.height > 1 && s.kind !== 'empty' ? ` · ${s.height}U` : ''}</text>}
          </g>
        );
      })}
      <title>{`${rack.ru}U${ud.mm ? `, ${ud.estimated ? '~' : ''}${ud.mm} mm usable depth` : ''}`}</title>
    </svg>
  );
}

// Home page hero: the Rack Builder in miniature. Pick a typical setup and the matched
// cabinet resizes around the equipment. Runs the same logic as the builder itself.
import { useEffect, useMemo, useState } from 'react';
import { PRESETS, DEFAULT_INPUT, recommend, fitOut, arrange, encodeInput, type BuilderInput } from '../../lib/builder';
import { formatRRP } from '../../lib/catalog';
import RackScene from './RackScene';
import { url } from '../../lib/url';
import './hero-rack.css';

const CYCLE_MS = 5600;

export default function HeroRack() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const preset = PRESETS[index];

  const { input, rec, plan } = useMemo(() => {
    const input: BuilderInput = { ...DEFAULT_INPUT, placement: preset.placement, devices: { ...preset.devices } };
    const rec = recommend(input);
    const lines = rec.rack ? fitOut(rec.rack, input, rec.need) : [];
    const on = new Set(lines.filter((l) => !l.optional || l.defaultOn).map((l) => l.sku));
    return { input, rec, plan: rec.rack ? arrange(rec.rack, input, rec.need, lines, on) : null };
  }, [preset]);

  // Step through the setups until someone takes over.
  useEffect(() => { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(true); }, []);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => { if (!document.hidden) setIndex((n) => (n + 1) % PRESETS.length); }, CYCLE_MS);
    return () => clearInterval(t);
  }, [auto]);

  const rack = rec.rack;
  if (!rack || !plan) return null;
  const price = formatRRP(rack);

  return (
    <div className="hr">
      <div className="hr-chips" role="group" aria-label="Typical setups">
        {PRESETS.map((p, n) => (
          <button key={p.id} type="button" className={`hr-chip ${auto ? 'is-auto' : ''}`} aria-pressed={n === index}
            style={{ animationDuration: `${CYCLE_MS}ms` }} onClick={() => { setAuto(false); setIndex(n); }}>{p.label}</button>
        ))}
      </div>
      <div className="hr-scene">
        <RackScene rack={rack} items={plan.items} seq={plan.seq} view="iso" doorOpen sway={auto} onOrbit={() => setAuto(false)} />
      </div>
      <div className="hr-card" aria-live="polite">
        <div className="hr-fit">
          <span>{preset.text}</span>
          <strong>{rack.name}</strong>
          <small><span className="sku">{rack.sku}</span> · {rec.need.usedU}U used of {rack.ru}U · {price ? `${price} RRP` : 'Price on request'}</small>
        </div>
        <a className="btn btn--primary btn--small" href={url(`/rack-builder?${encodeInput(input)}`)}>Open in builder</a>
      </div>
    </div>
  );
}

// The cabinet, drawn to scale in CSS 3D from the catalogue's dimensions, with the
// equipment inside it. One scene serves three camera positions (front, side, 3D) and
// can be turned freely by dragging. All geometry is in millimetres: the component sets
// unitless numbers and rack-scene.css turns them into pixels that fit the container.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { faceplate, finishOf, rackGeo, U_MM, type FaceKind } from '../../lib/art';
import { usableDepth, type Rack } from '../../lib/catalog';
import { GAP, type Placed } from '../../lib/builder';
import './rack-scene.css';

export type View = 'front' | 'side' | 'iso';
const PRESET: Record<View, { rx: number; ry: number }> = { front: { rx: 0, ry: 0 }, side: { rx: 0, ry: -90 }, iso: { rx: -13, ry: -33 } };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const TONE: Partial<Record<FaceKind, string>> = { switch: 'silver', poe: 'silver', router: 'silver', nvr: 'graphite', server1: 'graphite', server2: 'graphite' };
interface Box { x: number; y: number; w: number; h: number; d: number; tone: string }
/** The solid behind each front panel, so depth shows from the side. Mirrors the faceplate drawings. */
function bodies(it: Placed, pw: number): Box[] {
  const ph = it.ru * U_MM;
  if (it.kind === 'blank' || it.kind === 'free') return [];
  if (it.kind === 'shelf') {
    const wide = pw > 300, bw = wide ? 150 : 84, n = Math.max(1, Math.min(2, it.boxes ?? 1));
    const xs = wide ? [56, pw - 56 - bw] : n === 1 ? [(pw - bw) / 2] : [30, pw - 30 - bw];
    return [
      { x: 19, y: ph - 7.4, w: pw - 38, h: 6.6, d: it.depth, tone: 'black' },
      ...xs.slice(0, n).map((x, i) => ({ x, y: ph - 63.4, w: bw, h: 56, d: Math.min(190, it.depth - 20), tone: i ? 'graphite' : 'white' })),
    ];
  }
  return [{ x: 19, y: 0.6, w: pw - 38, h: ph - 1.2, d: it.depth, tone: TONE[it.face!] ?? 'black' }];
}

interface Props {
  rack: Rack;
  items: Placed[];
  seq?: string[];
  view: View;
  viewTick?: number;              // bump to return to `view` after the cabinet was turned by hand
  doorOpen: boolean;
  labels?: boolean;               // name tags beside the equipment (front view)
  dims?: boolean;                 // dimension lines
  sway?: boolean;                 // gentle idle movement
  selected?: string | null;
  hot?: string | null;            // highlighted from outside, e.g. a hovered parts-list row
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  onMove?: (item: Placed, to: number) => void;     // `to` indexes the sequence left after removing the item
  onStep?: (item: Placed, dir: -1 | 1) => void;
  onRemove?: (item: Placed) => void;
  onOrbit?: () => void;
}

type Drag =
  | { mode: 'pending' | 'orbit'; x: number; y: number; id?: string; rx: number; ry: number }
  | { mode: 'sort'; x: number; y: number; seq: number; row0: number; uh: number; waiting: boolean };

export default function RackScene({
  rack, items, seq = [], view, viewTick = 0, doorOpen, labels = false, dims = false, sway = false,
  selected = null, hot = null, onSelect, onHover, onMove, onStep, onRemove, onOrbit,
}: Props) {
  const g = useMemo(() => rackGeo(rack), [rack]);
  const [rot, setRot] = useState(PRESET[view]);
  const [orbiting, setOrbiting] = useState(false);
  const [sorting, setSorting] = useState<{ seq: number; dy: number; row0: number; uh: number } | null>(null);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bay = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const live = useRef({ items, seq });
  const refocus = useRef(false);
  live.current = { items, seq };

  useEffect(() => { setRot(PRESET[view]); }, [view, viewTick]);
  useEffect(() => { const d = drag.current; if (d?.mode === 'sort') d.waiting = false; }, [items]);
  useEffect(() => {
    if (!refocus.current || !selected) return;
    refocus.current = false;
    root.current?.querySelector<HTMLElement>(`[data-id="${selected}"] .rs-front`)?.focus();
  }, [selected, items]);

  // How much room the cabinet needs at this angle, in mm, so CSS can scale it to fit.
  const yaw = (rot.ry * Math.PI) / 180, pitch = (rot.rx * Math.PI) / 180;
  const cy = Math.abs(Math.cos(yaw)), sy = Math.abs(Math.sin(yaw));
  const door = !g.enclosed ? null : rack.door ?? (rack.type === 'soundproof' ? 'solid' : null);
  // An open door swings toward the viewer, so seen front-on perspective makes it reach further than its footprint.
  const reach = 0.24 + 0.1 * cy ** 8;
  const swing = door && doorOpen ? Math.max(0, g.W * (reach * Math.cos(yaw) - 0.97 * Math.sin(yaw))) : 0;
  const near = Math.abs(rot.ry) < 12 && Math.abs(rot.rx) < 8 ? 'front' : Math.abs(rot.ry) > 68 ? 'side' : 'iso';
  const grow = 1 + 0.16 * sy;                                    // perspective brings the near corner forward
  const fw = (g.W * cy + g.D * sy) * grow + swing;
  const fh = ((g.H + g.base) * Math.cos(pitch) + (g.D * cy + g.W * sy) * Math.abs(Math.sin(pitch))) * grow;
  const tall = rack.type === 'floor' || rack.type === 'soundproof' || (!g.enclosed && rack.ru > 12);
  const ud = usableDepth(rack);

  const vars = {
    '--mw': g.W, '--mh': g.H, '--md': g.D, '--fw': fw, '--fh': fh, '--bay': g.bay, '--btop': g.top,
    '--inset': g.inset, '--base': g.base, '--ru': rack.ru, '--mx': swing / 2, '--pd': tall ? 80 : g.D,
  } as CSSProperties;

  // ----- Pointer: drag the background to turn the cabinet, drag equipment (front view) to rearrange it.
  const canSort = !!onMove && near === 'front';
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('.rs-item[data-id]');
    drag.current = { mode: 'pending', x: e.clientX, y: e.clientY, id: el?.dataset.id, rx: rot.rx, ry: rot.ry };
  }
  function move(e: PointerEvent) {
    let d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (d.mode === 'pending') {
      if (Math.hypot(dx, dy) < 5) return;
      const id = d.id;
      const it = id ? live.current.items.find((i) => i.id === id) : undefined;
      if (it && it.seq >= 0 && canSort && e.pointerType !== 'touch') {
        const uh = (bay.current?.getBoundingClientRect().height ?? rack.ru * 20) / rack.ru;
        d = drag.current = { mode: 'sort', x: d.x, y: d.y, seq: it.seq, row0: rack.ru - it.u, uh, waiting: false };
        onSelect?.(null);
      } else if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
      else { d.mode = 'orbit'; setOrbiting(true); setTouched(true); onOrbit?.(); }
      root.current?.setPointerCapture(e.pointerId);
    }
    if (d.mode === 'orbit') setRot({ rx: clamp(d.rx - dy * 0.25, -34, 10), ry: clamp(d.ry + dx * 0.4, -100, 100) });
    if (d.mode === 'sort') sort(d, dy);
  }
  function sort(d: Extract<Drag, { mode: 'sort' }>, dy: number) {
    const { items: list, seq: order } = live.current;
    const me = list.find((i) => i.seq === d.seq);
    setSorting({ seq: d.seq, dy, row0: d.row0, uh: d.uh });
    if (!me || d.waiting) return;
    const row = (i: Placed) => rack.ru - i.u, mid = (i: Placed) => row(i) + i.ru / 2;
    const gap = order.indexOf(GAP);
    const others = list.filter((i) => i.seq >= 0 && i !== me);
    const centre = d.row0 + me.ru / 2 + dy / d.uh;
    const above = others.filter((i) => mid(i) < centre).length;
    const top = others.filter((i) => i.seq < gap), bottom = others.filter((i) => i.seq > gap);
    let to: number;
    if (above < top.length) to = above;
    else if (above > top.length) to = above + 1;
    else {
      const topEnd = top.reduce((m, i) => Math.max(m, row(i) + i.ru), 0);
      const bottomStart = bottom.reduce((m, i) => Math.min(m, row(i)), rack.ru);
      to = centre < (topEnd + bottomStart) / 2 ? top.length : top.length + 1;
    }
    if (to !== me.seq) { d.seq = to; d.waiting = true; setSorting({ seq: to, dy, row0: d.row0, uh: d.uh }); onMove?.(me, to); }
  }
  function up(e: PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (root.current?.hasPointerCapture(e.pointerId)) root.current.releasePointerCapture(e.pointerId);
    if (d.mode === 'pending') onSelect?.(d.id ?? null);
    setOrbiting(false);
    setSorting(null);
  }
  function key(e: KeyboardEvent, it: Placed) {
    if (it.seq >= 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); refocus.current = true; onStep?.(it, e.key === 'ArrowUp' ? -1 : 1); }
    else if (it.kind === 'device' && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); onRemove?.(it); }
  }

  const step = rack.ru <= 18 ? 1 : rack.ru <= 32 ? 2 : 3;
  const numbers = Array.from({ length: rack.ru }, (_, i) => rack.ru - i).filter((n) => n === 1 || n === rack.ru || n % step === 0);
  const interactive = !!onSelect;

  return (
    <div ref={root} className={cx('rs', orbiting && 'is-orbiting', sorting && 'is-sorting')}
      role={interactive ? 'group' : 'img'} aria-label={interactive ? `${rack.name}, ${near === 'iso' ? '3D' : near} view` : `${rack.name} with equipment fitted, illustration`}
      data-near={near} data-finish={finishOf(rack)} data-stand={tall ? 'floor' : 'wall'} data-door={door ? (doorOpen ? 'open' : 'closed') : 'none'}
      data-live={interactive || undefined} data-labels={labels ? 'on' : 'off'} data-xray={rot.ry < -56 ? 'right' : rot.ry > 56 ? 'left' : 'none'} data-enclosed={g.enclosed}
      style={vars} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="rs-fit">
        <div className={cx('rs-sway', sway && !touched && 'is-swaying')}>
          <div className="rs-world" style={{ transform: `rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)` }}>
            <i className={cx('rs-p', tall ? 'rs-shadow' : 'rs-wallshadow')} />
            {g.enclosed ? (
              <>
                <i className="rs-p rs-back" /><i className="rs-p rs-back-out" />
                <i className="rs-p rs-l-in" /><i className="rs-p rs-l-out" />
                <i className="rs-p rs-r-in" /><i className="rs-p rs-r-out" />
                <i className="rs-p rs-ceil" /><i className="rs-p rs-roof" data-fans={tall ? 4 : rack.type === 'mini' ? 0 : 2} />
                <i className="rs-p rs-floor" /><i className="rs-p rs-rim" />
                {g.base > 0 && <><i className="rs-p rs-base-f" /><i className="rs-p rs-base-l" /><i className="rs-p rs-base-r" /></>}
              </>
            ) : (
              <>
                {!tall && <i className="rs-p rs-back rs-back--plate" />}
                <i className="rs-p rs-arm rs-arm--l" /><i className="rs-p rs-arm rs-arm--r" />
                <i className="rs-p rs-post rs-post--l" /><i className="rs-p rs-post rs-post--r" />
                <i className="rs-p rs-bar rs-bar--t" /><i className="rs-p rs-bar rs-bar--b" />
                {tall && <i className="rs-p rs-foot" />}
              </>
            )}

            <div className="rs-bay" ref={bay}>
              <div className="rs-rails" />
              <div className="rs-unums" aria-hidden="true">
                {numbers.map((n) => <span key={n} style={{ '--row': rack.ru - n } as CSSProperties}>{n}</span>)}
              </div>
              {items.map((it) => {
                const st = { '--row': rack.ru - it.u, '--u': it.ru } as CSSProperties;
                const isSel = selected === it.id, isDragged = !!sorting && sorting.seq === it.seq;
                if (isDragged) (st as Record<string, string>)['--drag'] = `${sorting!.dy - (rack.ru - it.u - sorting!.row0) * sorting!.uh}px`;
                if (it.kind === 'free') {
                  return (
                    <div key={it.id} className={cx('rs-item rs-item--free', isSel && 'is-selected')} style={st} data-id={it.id}>
                      <button type="button" className="rs-free" disabled={!interactive} aria-pressed={isSel}
                        aria-label={`${it.ru}U free. Add equipment`} onClick={(e) => { if (e.detail === 0) onSelect?.(it.id); }}>
                        <span>{interactive ? '+ Add equipment' : ''}</span>
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={it.id} data-id={it.id} style={st}
                    className={cx('rs-item', `rs-item--${it.kind}`, it.seq >= 0 && canSort && 'is-movable', isSel && 'is-selected', hot === it.id && 'is-hot', isDragged && 'is-dragging')}>
                    {bodies(it, g.bay).map((b, i) => (
                      <div key={i} className="rs-box" data-tone={b.tone}
                        style={{ '--bx': b.x, '--by': b.y, '--bw': b.w, '--bh': b.h, '--bd': b.d } as CSSProperties}><i className="t" /><i className="l" /><i className="r" /></div>
                    ))}
                    <button type="button" className="rs-front" tabIndex={interactive ? 0 : -1} aria-pressed={interactive ? isSel : undefined}
                      aria-label={`${it.label}, ${it.ru}U, unit ${it.u}${it.seq >= 0 && onStep ? '. Arrow keys move it' : ''}`}
                      onClick={(e) => { if (e.detail === 0) onSelect?.(isSel ? null : it.id); }} onKeyDown={(e) => key(e, it)}
                      onPointerEnter={() => onHover?.(it.id)} onPointerLeave={() => onHover?.(null)}
                      dangerouslySetInnerHTML={{ __html: faceplate(it.face!, it.ru, rack.standard, it.boxes) }} />
                    <span className="rs-tag" aria-hidden="true">{it.label}<i>{it.ru}U</i></span>
                  </div>
                );
              })}
            </div>

            {door && <div className="rs-door" data-kind={door} aria-hidden="true" />}

            {dims && (
              <>
                {g.known.W && <div className="rs-dim rs-dim-w"><span>{g.W} mm</span></div>}
                <div className="rs-dim rs-dim-h"><span>{rack.ru}U{g.known.H ? ` · ${g.H} mm` : ''}</span></div>
                <div className="rs-sideplane">
                  {g.enclosed && g.usable != null && (
                    <div className="rs-usable" style={{ '--usable': Math.min(g.usable, g.D - g.inset) } as CSSProperties}>
                      <span>{ud.estimated ? '~' : ''}{g.usable} mm usable{ud.estimated ? ' (estimate)' : ''}</span>
                    </div>
                  )}
                  {g.known.D && <div className="rs-dim rs-dim-d"><span>{g.D} mm</span></div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

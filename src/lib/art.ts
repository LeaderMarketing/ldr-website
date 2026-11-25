// Artwork generated from catalogue data, as SVG strings so Astro pages and the
// React builder draw the same things. Everything is drawn in millimetres:
//   - faceplate():   19" / 10" equipment front panels, true to scale
//   - cabinetArt():  cabinet illustration for products without a photo yet
//   - lineupArt():   several cabinets side by side at one scale
//   - dimensionArt(): front and side outline with dimension lines
import type { Rack } from './catalog';

export const U_MM = 44.45;
export const PANEL_MM = { '19': 482.6, '10': 254 } as const;
export type Std = '19' | '10';
export type FaceKind =
  | 'patch' | 'cable' | 'switch' | 'poe' | 'router' | 'shelf' | 'nvr' | 'av'
  | 'server1' | 'server2' | 'ups' | 'pdu' | 'blank';

const f = (v: number) => +v.toFixed(2);
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra}/>`;

// ---------- Equipment faceplates ----------
interface Tone { body: string; hi: string; lo: string; ink: string; hole: string; line: string }
// Silver = the customer's own equipment. Black = LDR parts that appear on the parts list.
const TONE: Record<'silver' | 'graphite' | 'black', Tone> = {
  silver:   { body: '#cfd3da', hi: '#f3f4f7', lo: '#989fab', ink: '#565c67', hole: '#1b1e23', line: '#aab0bb' },
  graphite: { body: '#3d4149', hi: '#626873', lo: '#1f2226', ink: '#b3b9c4', hole: '#0d0e10', line: '#5a606b' },
  black:    { body: '#1c1d21', hi: '#3c3f46', lo: '#0a0a0c', ink: '#8e939d', hole: '#050506', line: '#30333a' },
};
const GREEN = '#3ddc84', AMBER = '#ffb020', BLUE = '#58b7ff', RED = '#ff5a4f';

/** LEDs get a deterministic "random" rhythm so the markup is stable between server and client. */
function led(i: number, x: number, y: number, color: string, blink: boolean, s = 1.7) {
  const base = `x="${f(x)}" y="${f(y)}" width="${s}" height="${s}" rx="${s / 3}" fill="${color}"`;
  if (!blink) return `<rect ${base}/>`;
  const dur = 0.9 + ((i * 53) % 19) / 10, delay = ((i * 37) % 23) / 10;
  return `<rect class="led" style="animation-duration:${dur}s;animation-delay:-${delay}s" ${base}/>`;
}

function plate(pw: number, ph: number, ru: number, t: Tone) {
  let s = rect(0.3, 0.4, pw - 0.6, ph - 0.8, t.body, ' rx="1.4"');
  s += rect(1.2, 0.4, pw - 2.4, 1, t.hi, ' opacity=".8"');
  s += rect(1.2, ph - 1.5, pw - 2.4, 1.1, t.lo, ' opacity=".9"');
  for (let i = 0; i < ru; i++) for (const y of [6.35, 38.1]) for (const x of [7, pw - 7])
    s += rect(x - 3, i * U_MM + y - 1.9, 6, 3.8, t.hole, ' rx="1.9"');
  return s;
}
const port = (x: number, y: number, t: Tone, w = 10.6, h = 8.4) =>
  rect(x, y, w, h, t.hole, ' rx=".9"') + rect(x + 1.9, y + 1.3, w - 3.8, 1, '#b9974a', ' opacity=".5"');
const mark = (x: number, y: number, t: Tone) =>
  `<text x="${f(x)}" y="${f(y)}" font-size="6.4" font-weight="700" letter-spacing=".4" fill="${t.ink}" font-family="Inter,Arial,sans-serif">LDR</text>`;

type Draw = (pw: number, ph: number, ru: number, wide: boolean, o: { boxes?: number }) => string;

const drawSwitch = (poe: boolean): Draw => (pw, ph, ru, wide) => {
  const t = TONE.silver;
  let s = plate(pw, ph, ru, t);
  s += rect(22, 9, 11, 2.6, t.ink, ' rx="1.3" opacity=".55"');
  s += led(1, 22, 20, GREEN, false) + led(2, 26.5, 20, poe ? AMBER : GREEN, true);
  if (poe) s += rect(22, 30, 13, 3, AMBER, ' rx="1.5"');
  const cols = wide ? 12 : 4, x0 = wide ? 62 : 44;
  for (let c = 0; c < cols; c++) {
    const x = x0 + c * 12.6 + (c >= cols / 2 ? 5 : 0);
    s += port(x, 7.2, t) + port(x, 25.6, t);
    s += led(c * 2 + 3, x + 1.6, 19.4, GREEN, c % 3 === 0) + led(c * 2 + 4, x + 7, 19.4, poe && c % 2 ? AMBER : GREEN, c % 4 === 1);
  }
  const n = wide ? 4 : 2, sx = pw - 22 - n * 15;
  for (let i = 0; i < n; i++) s += rect(sx + i * 15, 16.5, 12.6, 11, t.hole, ` rx="1" stroke="${t.lo}" stroke-width=".7"`);
  return s;
};

const drawRouter: Draw = (pw, ph, ru, wide) => {
  const t = TONE.silver;
  let s = plate(pw, ph, ru, t);
  s += rect(24, 11.5, 36, 21, '#0c2a4a', ' rx="1.8"');
  s += rect(27.5, 17, 19, 1.7, '#7cc7ff', ' rx=".8"') + rect(27.5, 21.5, 12, 1.7, '#7cc7ff', ' rx=".8" opacity=".6"') + rect(27.5, 26, 24, 1.7, '#7cc7ff', ' rx=".8" opacity=".35"');
  const cols = wide ? 8 : 4, x0 = wide ? 96 : 70;
  for (let c = 0; c < cols; c++) {
    const x = x0 + c * 13.4 + (c >= 2 ? 9 : 0);
    s += port(x, 19, t) + led(c + 5, x + 4.4, 13.6, c < 2 ? BLUE : GREEN, c % 2 === 0);
  }
  if (wide) {
    s += rect(pw - 92, 19, 10.6, 8.4, '#0c2a4a', ` rx=".9" stroke="${BLUE}" stroke-width=".7"`);
    s += rect(pw - 70, 20.5, 8, 4, t.hole, ' rx=".6"') + rect(pw - 58, 20.5, 8, 4, t.hole, ' rx=".6"');
    s += circle(pw - 34, 22.5, 4.6, t.body, ` stroke="${t.lo}" stroke-width="1"`) + led(30, pw - 34.9, 21.6, GREEN, false, 1.8);
  }
  return s;
};

const drawPatch: Draw = (pw, ph, ru, wide) => {
  const t = TONE.black;
  let s = plate(pw, ph, ru, t);
  const cols = wide ? 24 : 12, pitch = wide ? 15.4 : 15, gap = 7;
  const groups = cols / 6, total = cols * pitch + (groups - 1) * gap, x0 = (pw - total) / 2 + (wide ? 8 : 0);
  if (wide) s += mark(22, 27.2, t);
  for (let g = 0; g < groups; g++) {
    const gx = x0 + g * (6 * pitch + gap);
    s += rect(gx, 11.2, 6 * pitch - 4, 4.6, '#e7e8eb', ' rx=".7" opacity=".9"');
    for (let c = 0; c < 6; c++) s += port(gx + c * pitch, 20.4, t, 11.4, 9.8);
  }
  return s;
};

const drawCable: Draw = (pw, ph, ru, wide) => {
  const t = TONE.black;
  let s = plate(pw, ph, ru, t);
  const n = wide ? 5 : 3, rw = wide ? 50 : 46, x0 = 30, span = pw - 60 - rw;
  s += rect(22, 19.5, pw - 44, 5.6, t.line, ' rx="1.2"');
  for (let i = 0; i < n; i++)
    s += rect(x0 + (span * i) / (n - 1), 8.4, rw, 27.6, 'none', ` rx="7" stroke="#5a5e67" stroke-width="2.8"`);
  return s;
};

const drawShelf: Draw = (pw, ph, _ru, wide, o) => {
  const t = TONE.black, y1 = ph - U_MM;
  let s = '';
  for (const x of [0.3, pw - 19.3]) {
    s += rect(x, y1 + 0.4, 19, U_MM - 0.8, t.body, ' rx="1.4"');
    for (const y of [6.35, 38.1]) s += rect(x + 6.5, y1 + y - 1.9, 6, 3.8, t.hole, ' rx="1.9"');
  }
  s += rect(19, ph - 7.4, pw - 38, 6.6, t.body, ' rx="1"') + rect(19, ph - 7.4, pw - 38, 1, t.hi, ' opacity=".8"');
  const bw = wide ? 150 : 84, bh = 56, by = ph - 7.4 - bh;
  const xs = wide ? [56, pw - 56 - bw] : [30, pw - 30 - bw];
  const count = Math.max(1, Math.min(2, o.boxes ?? 1));
  for (let i = 0; i < count; i++) {
    const x = count === 1 && !wide ? (pw - bw) / 2 : xs[i];
    if (i === 0) {
      s += rect(x, by, bw, bh, '#e9ebef', ' rx="5"') + rect(x, by + bh - 9, bw, 9, '#c9cdd4', ' rx="4"');
      s += rect(x + 12, by + 14, bw - 24, 2.2, '#b6bbc4', ' rx="1.1"');
      for (let k = 0; k < 4; k++) s += led(40 + k, x + 14 + k * 8, by + 26, k === 3 ? AMBER : GREEN, k > 0, 2.4);
    } else {
      s += rect(x, by, bw, bh, '#2d3036', ' rx="4"') + rect(x, by, bw, 1.4, '#555a64', ' rx=".7"');
      for (let k = 0; k < 6; k++) s += rect(x + 14, by + 12 + k * 5.4, bw * 0.45, 2, '#15171a', ' rx="1"');
      s += led(50, x + bw - 20, by + 14, BLUE, true, 2.6) + led(51, x + bw - 13, by + 14, GREEN, false, 2.6);
    }
  }
  return s;
};

const drawNvr: Draw = (pw, ph, ru, wide) => {
  const t = TONE.graphite;
  let s = plate(pw, ph, ru, t);
  const bays = wide ? 4 : 2, bw = 78, bh = 62, x0 = pw - 24 - bays * 82;
  s += circle(42, 30, 6.4, t.lo, ` stroke="${t.hi}" stroke-width="1.2"`) + led(60, 41.1, 29.1, GREEN, false, 1.8);
  s += led(61, 37, 54, RED, true, 2.6) + rect(43.5, 54.6, 12, 1.5, t.ink, ' rx=".7" opacity=".6"');
  for (let i = 0; i < bays; i++) {
    const x = x0 + i * 82;
    s += rect(x, 13.4, bw, bh, '#25282d', ` rx="1.6" stroke="${t.line}" stroke-width=".8"`);
    for (let k = 0; k < 5; k++) s += rect(x + 7, 21 + k * 6.2, bw - 14, 2.2, '#16181b', ' rx="1.1"');
    s += rect(x + 5, 13.4 + bh - 10, bw - 10, 4, '#59606b', ' rx="2"') + led(62 + i, x + bw - 8, 16.6, i === 1 ? BLUE : GREEN, i % 2 === 0, 2);
  }
  return s;
};

const drawAv: Draw = (pw, ph, ru, wide) => {
  const t = TONE.black;
  let s = plate(pw, ph, ru, t);
  const cy = ph / 2, kx = wide ? 64 : 48;
  s += circle(kx, cy, 17, '#0e0f11', ' stroke="#8a909b" stroke-width="1.3"') + circle(kx, cy, 12, '#2c2f35');
  s += `<line x1="${kx}" y1="${f(cy - 4)}" x2="${kx}" y2="${f(cy - 11)}" stroke="#e7e9ed" stroke-width="1.6" stroke-linecap="round"/>`;
  const dx = kx + 34, dw = wide ? 150 : 76;
  s += rect(dx, 24, dw, 26, '#05070a', ' rx="2.4" stroke="#33363d" stroke-width=".7"');
  const bars = wide ? 14 : 7;
  for (let i = 0; i < bars; i++) {
    const h = 4 + ((i * 7) % 11);
    s += rect(dx + 8 + i * 9.6, 45 - h, 5.6, h, i > bars - 4 ? AMBER : GREEN, ' rx="1" opacity=".9"');
  }
  for (let i = 0; i < (wide ? 7 : 4); i++) s += circle(dx + 6 + i * 14, 64, 3.3, '#30333a', ' stroke="#55595f" stroke-width=".6"');
  if (wide) {
    s += circle(pw - 70, cy, 9.5, '#0e0f11', ' stroke="#8a909b" stroke-width="1.1"');
    s += led(70, pw - 42, cy - 12, BLUE, false, 2.4) + rect(pw - 46, cy + 4, 10, 5, t.hole, ' rx="1"');
  }
  return s;
};

const drawServer = (rows: 1 | 2): Draw => (pw, ph, ru, wide) => {
  const t = TONE.graphite;
  let s = plate(pw, ph, ru, t);
  s += rect(21, ph / 2 - 14, 5.5, 28, t.hi, ' rx="2.4"') + rect(pw - 26.5, ph / 2 - 14, 5.5, 28, t.hi, ' rx="2.4"');
  const cols = rows === 1 ? (wide ? 8 : 4) : (wide ? 4 : 2);
  const bw = rows === 1 ? 30.5 : 86, bh = rows === 1 ? 33 : 35.4, px = rows === 1 ? 32.4 : 89, py = 38.6;
  const x0 = 34, y0 = rows === 1 ? 5.7 : 7;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * px, y = y0 + r * py, i = r * cols + c;
    s += rect(x, y, bw, bh, '#262a30', ' rx="1.2" stroke="#6f7682" stroke-width=".65"');
    for (let k = 0; k < 4; k++) s += rect(x + bw * 0.16, y + 6 + k * (bh - 16) / 3, bw * 0.68, 1.5, '#131518', ' rx=".7"');
    s += led(80 + i, x + 2.4, y + bh - 4.2, i % 5 === 3 ? AMBER : GREEN, i % 2 === 0, 1.9);
  }
  const cx = x0 + cols * px + 16, vw = pw - 34 - cx - 26;
  if (vw > 30) for (let k = 0; k < Math.floor((ph - 16) / 5); k++) s += rect(cx, 8 + k * 5, vw, 2.2, '#17191c', ' rx="1.1"');
  s += circle(pw - 44, ph / 2 - 6, 4.6, t.lo, ` stroke="${GREEN}" stroke-width="1.1"`) + led(99, pw - 45, ph / 2 + 5, BLUE, false, 2);
  return s;
};

const drawUps: Draw = (pw, ph, ru, wide) => {
  const t = TONE.black;
  let s = plate(pw, ph, ru, t);
  const lw = wide ? 66 : 54;
  s += rect(30, 22, lw, 44, '#0a2733', ' rx="3" stroke="#1e5266" stroke-width=".9"');
  for (let i = 0; i < 5; i++) s += rect(37 + i * (lw - 14) / 5, 31, (lw - 14) / 5 - 2.4, 13, '#35d0e6', ` rx="1" opacity="${f(1 - i * 0.16)}"`);
  s += rect(37, 51, lw * 0.5, 2.2, '#35d0e6', ' rx="1" opacity=".7"') + rect(37, 56.4, lw * 0.32, 2.2, '#35d0e6', ' rx="1" opacity=".4"');
  const bx = 30 + lw + 12;
  for (let i = 0; i < 3; i++) s += circle(bx, 29 + i * 15, 4.4, '#2d3036', ' stroke="#565a63" stroke-width=".7"');
  s += led(110, bx + 9, 27.6, GREEN, false, 2.4);
  const vx = bx + 20, vw = pw - 26 - vx;
  for (let k = 0; k < 9; k++) s += rect(vx, 14.5 + k * 6.9, vw, 2.9, '#08080a', ' rx="1.4"');
  return s;
};

const drawPdu: Draw = (pw, ph, ru, wide) => {
  const t = TONE.black;
  let s = plate(pw, ph, ru, t);
  const cy = ph / 2;
  s += circle(wide ? 36 : 30, cy, 7.4, '#070708', ` stroke="${t.line}" stroke-width="1"`);
  if (wide) {
    s += rect(60, cy - 10, 16, 20, '#a3231c', ' rx="2.2"') + rect(60, cy - 10, 16, 9, '#d6392f', ' rx="2.2"');
    s += circle(96, cy, 4.8, '#2b2d32', ` stroke="${t.hi}" stroke-width=".8"`) + mark(110, cy + 2.4, t);
  }
  const per = wide ? 6 : 3, x0 = wide ? 152 : 62, pitch = wide ? 50 : 54;
  for (let r = 0; r < ru; r++) for (let c = 0; c < per; c++) {
    const x = x0 + c * pitch, y = r * U_MM + 9.2;
    s += rect(x, y, 26, 26, '#27292e', ' rx="4.5" stroke="#4d5159" stroke-width=".8"');
    s += `<g stroke="#050506" stroke-width="1.9" stroke-linecap="round"><line x1="${f(x + 8)}" y1="${f(y + 7)}" x2="${f(x + 10.6)}" y2="${f(y + 11.6)}"/><line x1="${f(x + 18)}" y1="${f(y + 7)}" x2="${f(x + 15.4)}" y2="${f(y + 11.6)}"/><line x1="${f(x + 13)}" y1="${f(y + 15)}" x2="${f(x + 13)}" y2="${f(y + 20.4)}"/></g>`;
  }
  return s;
};

const drawBlank: Draw = (pw, ph, ru) => {
  const t = TONE.black;
  return plate(pw, ph, ru, t) + rect(22, 3.6, pw - 44, ph - 7.2, 'none', ` rx="1.6" stroke="${t.line}" stroke-width=".6" opacity=".8"`);
};

const DRAW: Record<FaceKind, Draw> = {
  patch: drawPatch, cable: drawCable, switch: drawSwitch(false), poe: drawSwitch(true), router: drawRouter,
  shelf: drawShelf, nvr: drawNvr, av: drawAv, server1: drawServer(1), server2: drawServer(2),
  ups: drawUps, pdu: drawPdu, blank: drawBlank,
};

const cache = new Map<string, string>();
/** Front panel of a piece of equipment, `ru` units high, for a 19" or 10" rack. Stretches to fill its box. */
export function faceplate(kind: FaceKind, ru: number, std: Std = '19', boxes = 1): string {
  const key = `${kind}|${ru}|${std}|${boxes}`;
  let hit = cache.get(key);
  if (!hit) {
    const pw = PANEL_MM[std], ph = ru * U_MM;
    hit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${f(ph)}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${DRAW[kind](pw, ph, ru, std === '19', { boxes })}</svg>`;
    cache.set(key, hit);
  }
  return hit;
}

/** A close crop of the faceplate's most recognisable part, used as a small thumbnail. */
const THUMB_X: Partial<Record<FaceKind, number>> = { switch: 48, poe: 48, patch: 40, router: 14, pdu: 44, shelf: 40, nvr: 150, server1: 24, server2: 24, cable: 20 };
export function faceThumb(kind: FaceKind, ru: number): string {
  const key = `t|${kind}|${ru}`;
  let hit = cache.get(key);
  if (!hit) {
    const ph = ru * U_MM, w = ru > 1 ? 196 : 148;
    hit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${THUMB_X[kind] ?? 14} 0 ${w} ${f(ph)}" aria-hidden="true" focusable="false">${DRAW[kind](PANEL_MM['19'], ph, ru, true, { boxes: 2 })}</svg>`;
    cache.set(key, hit);
  }
  return hit;
}

// ---------- Cabinet geometry ----------
export interface Geo {
  W: number; H: number; D: number;   // external size in mm (illustrative where the datasheet value is unknown)
  bay: number;                        // equipment panel width
  top: number;                        // from the cabinet top to the first rack unit
  inset: number;                      // front of cabinet to the front mounting rails
  base: number;                       // plinth / castor height under floor cabinets
  usable: number | null;              // usable mounting depth
  enclosed: boolean;                  // false for open frames and brackets
  known: { W: boolean; H: boolean; D: boolean; usable: boolean };
}
const SHAPE: Record<Rack['type'], { W: number; D: number; frame: number; base: number; enclosed: boolean }> = {
  wall:         { W: 600, D: 450,  frame: 100, base: 0,  enclosed: true },
  floor:        { W: 600, D: 800,  frame: 120, base: 70, enclosed: true },
  soundproof:   { W: 750, D: 1100, frame: 220, base: 80, enclosed: true },
  mini:         { W: 312, D: 300,  frame: 70,  base: 0,  enclosed: true },
  vertical:     { W: 570, D: 250,  frame: 60,  base: 0,  enclosed: true },
  'open-frame': { W: 520, D: 300,  frame: 50,  base: 0,  enclosed: false },
  bracket:      { W: 500, D: 160,  frame: 30,  base: 0,  enclosed: false },
};
export function rackGeo(r: Rack): Geo {
  const d = SHAPE[r.type], uH = r.ru * U_MM;
  const floorFrame = r.type === 'open-frame' && r.ru > 12;
  const W = r.width ?? d.W, D = r.depth ?? (floorFrame ? 600 : d.D);
  const knownH = !!r.heightMm && r.heightMm >= uH + 30;
  const H = knownH ? r.heightMm! : uH + d.frame;
  const usable = r.mountDepth ?? (r.depth ? r.depth - 100 : null);
  const inset = d.enclosed ? Math.max(25, Math.min(110, (D - (usable ?? D - 100)) / 2)) : 0;
  return {
    W, H, D, bay: PANEL_MM[r.standard], top: (H - uH) / 2, inset, base: d.base, usable, enclosed: d.enclosed,
    known: { W: r.width != null, H: knownH, D: r.depth != null, usable: r.mountDepth != null },
  };
}

export type Finish = 'carbon' | 'black' | 'white';
export const finishOf = (r: Rack): Finish => (r.range === 'carbon' ? 'carbon' : /white/i.test(r.colour) ? 'white' : 'black');

// ---------- Cabinet illustration (oblique projection) ----------
const PAINT: Record<Finish, { front: string; top: string; side: string; edge: string; glass: string; glint: string; metal: string }> = {
  carbon: { front: '#30333a', top: '#474b53', side: '#222429', edge: '#5b606a', glass: '#12161b', glint: '#ffffff', metal: '#9da3ae' },
  black:  { front: '#191a1d', top: '#2c2e33', side: '#0f1011', edge: '#40434a', glass: '#0a0d11', glint: '#ffffff', metal: '#9da3ae' },
  white:  { front: '#eef0f3', top: '#ffffff', side: '#d4d8de', edge: '#b4bac4', glass: '#9aa3b0', glint: '#ffffff', metal: '#7d8490' },
};
const KX = 0.4, KY = 0.23;

export interface Shape { w: number; h: number; inner: string }
/** Cabinet drawn in mm with its bounding box, so several can share one scale. */
export function cabinetShape(r: Rack, uid = r.slug): Shape {
  const g = rackGeo(r), p = PAINT[finishOf(r)];
  const { W, H, D } = g, ox = D * KX, oy = D * KY;
  const foot = g.base ? 46 : 0;
  let s = '';
  const plane = (y: number) => `<g transform="matrix(1 0 ${KX} ${-KY} 0 ${f(y)})">`; // (x, z) on a horizontal surface
  const top = plane(oy);
  const side = `<g transform="matrix(${KX} ${-KY} 0 1 ${f(W)} ${f(oy)})">`;          // (z, y) on the right-hand panel

  if (!g.enclosed) {
    const post = Math.min(46, W * 0.09), pd = Math.min(D, 90);
    const tall = r.ru > 12;
    if (tall) s += `${plane(oy + H)}${rect(-40, 0, W + 80, D, p.side, ' rx="6"')}</g>`;
    else s += `<g transform="translate(${f(ox)} 0)">${rect(0, 0, W, H, p.side, ' rx="4" opacity=".55"')}</g>`;
    for (const x of [0, W - post]) {
      s += `<g transform="matrix(${KX} ${-KY} 0 1 ${f(x + post)} ${f(oy)})">${rect(0, 0, pd, H, p.side)}</g>`;
      s += rect(x, oy, post, H, p.front, ' rx="2"');
      for (let u = 0; u < r.ru * 3; u++) s += rect(x + post / 2 - 3, oy + g.top + u * (U_MM / 3) + 4, 6, 6, p.glass, ' rx="1"');
    }
    s += rect(0, oy, W, Math.max(18, g.top * 0.8), p.front, ' rx="2"') + rect(0, oy + H - Math.max(18, g.top * 0.8), W, Math.max(18, g.top * 0.8), p.front, ' rx="2"');
    return { w: W + ox + (tall ? 60 : 0), h: H + oy + (tall ? 90 : 0), inner: s };
  }

  // Feet behind the body, then roof and side panel, then the front.
  if (foot) s += rect(W + ox - 52, H - 4, 26, foot, '#0c0c0d', ' rx="5"');
  s += `<polygon points="0,${f(oy)} ${f(W)},${f(oy)} ${f(W + ox)},0 ${f(ox)},0" fill="${p.top}"/>`;
  s += top;
  if (r.type === 'floor' || r.type === 'soundproof') {
    s += rect(W * 0.2, D * 0.3, W * 0.6, D * 0.4, p.front, ' rx="14" opacity=".55"');
    for (const [fx, fz] of [[0.36, 0.4], [0.64, 0.4], [0.36, 0.6], [0.64, 0.6]]) s += circle(W * fx, D * fz, Math.min(W, D) * 0.075, p.side);
  } else if (r.type !== 'mini') {
    for (const fx of [0.32, 0.68]) s += circle(W * fx, D * 0.5, Math.min(W, D) * 0.15, p.side) + circle(W * fx, D * 0.5, Math.min(W, D) * 0.05, p.front);
  } else for (let k = 0; k < 5; k++) s += rect(W * 0.25, D * (0.28 + k * 0.1), W * 0.5, D * 0.035, p.side, ' rx="4"');
  s += '</g>';
  s += `<polygon points="${f(W)},${f(oy)} ${f(W + ox)},0 ${f(W + ox)},${f(H)} ${f(W)},${f(oy + H)}" fill="${p.side}"/>`;
  s += side + rect(D * 0.06, H * 0.04, D * 0.88, H * 0.92, 'none', ` rx="6" stroke="${p.edge}" stroke-width="2.4" opacity=".55"`);
  for (let k = 0; k < 6; k++) s += rect(D * 0.2, H * 0.08 + k * 11, D * 0.6, 4.5, p.front, ' rx="2" opacity=".7"');
  s += '</g>';

  if (foot) for (const x of [26, W - 58]) s += rect(x, oy + H - 4, 32, foot + 4, '#0c0c0d', ' rx="6"');
  s += rect(0, oy, W, H, p.front, ' rx="5"');
  s += rect(0, oy, W, 2.6, p.edge, ' rx="1.3" opacity=".8"');

  const m = Math.max(16, Math.min(34, W * 0.045)), dx = m, dy = oy + m, dw = W - 2 * m, dh = H - 2 * m;
  if (r.door === 'mesh') {
    const id = `mesh-${uid}`;
    s += `<defs><pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="${p.front}"/><circle cx="4.5" cy="4.5" r="2.7" fill="#050506"/></pattern></defs>`;
    s += rect(dx, dy, dw, dh, `url(#${id})`, ` rx="4" stroke="${p.edge}" stroke-width="2.5"`);
    s += rect(dx + dw / 2 - 3, dy, 6, dh, p.front) + rect(dx, dy + dh * 0.5 - 3, dw, 6, p.front);
  } else if (r.door === 'glass') {
    s += rect(dx, dy, dw, dh, p.glass, ` rx="4" stroke="${p.edge}" stroke-width="2.5"`);
    s += rect(dx + dw * 0.16, dy + 3, dw * 0.11, dh - 6, p.glint, ' opacity=".07"') + rect(dx + dw * 0.31, dy + 3, dw * 0.035, dh - 6, p.glint, ' opacity=".06"');
    for (const x of [dx + dw * 0.1, dx + dw * 0.9]) s += rect(x - 3, dy + 10, 6, dh - 20, p.glint, ' opacity=".05"');
  } else {
    s += rect(dx, dy, dw, dh, p.side, ` rx="4" stroke="${p.edge}" stroke-width="2.5"`);
    for (const fy of [0.08, 0.86]) for (let k = 0; k < 5; k++) s += rect(dx + dw * 0.18, dy + dh * fy + k * 12, dw * 0.64, 5, p.front, ' rx="2.5"');
  }
  if (H > 900) s += rect(dx + dw - 30, oy + H / 2 - 62, 13, 124, p.metal, ' rx="6"');
  else s += circle(dx + dw - 16, oy + H / 2, 8.5, p.metal) + circle(dx + dw - 16, oy + H / 2, 3, p.side);
  return { w: W + ox, h: H + oy + foot, inner: s };
}

export function cabinetArt(r: Rack): string {
  const sh = cabinetShape(r);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-sh.w * 0.04)} ${f(-sh.h * 0.03)} ${f(sh.w * 1.08)} ${f(sh.h * 1.06)}" role="img" aria-label="${r.name}, illustration">${sh.inner}</svg>`;
}

/** Cabinets side by side at one scale, standing on a common floor line. */
export function lineupArt(list: Rack[], opts: { gap?: number; labels?: boolean; ink?: string; muted?: string } = {}): string {
  const gap = opts.gap ?? 150, ink = opts.ink ?? '#f5f5f7', muted = opts.muted ?? '#8e8e93';
  const shapes = list.map((r, i) => ({ r, sh: cabinetShape(r, `lu${i}-${r.slug}`) }));
  const maxH = Math.max(...shapes.map((x) => x.sh.h)), fs = maxH * 0.034, pad = opts.labels ? fs * 3.6 : 0;
  let x = 0, body = '';
  for (const { r, sh } of shapes) {
    body += `<a href="/products/${r.slug}" class="lu-item"><title>${r.name} (${r.sku})</title><g transform="translate(${f(x)} ${f(maxH - sh.h)})">${sh.inner}</g>`;
    if (opts.labels) body += `<text x="${f(x + (sh.w - rackGeo(r).D * KX) / 2)}" y="${f(maxH + fs * 1.9)}" text-anchor="middle" font-size="${f(fs)}" font-weight="600" fill="${ink}">${r.ru}U</text><text x="${f(x + (sh.w - rackGeo(r).D * KX) / 2)}" y="${f(maxH + fs * 3.1)}" text-anchor="middle" font-size="${f(fs * 0.62)}" fill="${muted}">${r.type === 'mini' ? '10"' : r.type}</text>`;
    body += '</a>';
    x += sh.w + gap;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(x - gap)} ${f(maxH + pad)}" role="img" aria-label="${list.length} cabinets drawn to the same scale" font-family="Inter,Arial,sans-serif">${body}</svg>`;
}

// ---------- Dimension drawing (front and side outline) ----------
export function dimensionArt(r: Rack): string {
  const g = rackGeo(r), { W, H, D } = g;
  const gap = Math.max(W, D) * 0.34, fs = Math.max(H, W + D + gap) * 0.03, pad = fs * 3.2;
  const ink = '#1d1d1f', muted = '#86868b', blue = '#0064e0', bayX = (W - g.bay) / 2, uH = r.ru * U_MM;
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string, known: boolean) => {
    const vertical = x1 === x2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, t = fs * 0.35;
    const ticks = vertical
      ? `M${f(x1 - t)} ${f(y1)}h${f(2 * t)}M${f(x1 - t)} ${f(y2)}h${f(2 * t)}`
      : `M${f(x1)} ${f(y1 - t)}v${f(2 * t)}M${f(x2)} ${f(y1 - t)}v${f(2 * t)}`;
    const text = vertical
      ? `<text transform="translate(${f(mx - fs * 0.6)} ${f(my)}) rotate(-90)" text-anchor="middle" font-size="${f(fs)}" fill="${known ? ink : muted}">${label}</text>`
      : `<text x="${f(mx)}" y="${f(my + fs * 1.35)}" text-anchor="middle" font-size="${f(fs)}" fill="${known ? ink : muted}">${label}</text>`;
    return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}${ticks}" stroke="${muted}" stroke-width="${f(fs * 0.07)}" fill="none"/>${text}`;
  };
  const box = (x: number, w: number) => rect(x, 0, w, H, '#f5f5f7', ` rx="${f(fs * 0.3)}" stroke="${ink}" stroke-width="${f(fs * 0.11)}"`);
  let s = '';
  // Front
  s += box(0, W) + rect(bayX, g.top, g.bay, uH, '#ffffff', ` stroke="${muted}" stroke-width="${f(fs * 0.06)}"`);
  for (let u = 1; u < r.ru; u++) s += `<line x1="${f(bayX)}" x2="${f(bayX + g.bay)}" y1="${f(g.top + u * U_MM)}" y2="${f(g.top + u * U_MM)}" stroke="#d2d2d7" stroke-width="${f(fs * 0.04)}"/>`;
  s += `<text x="${f(W / 2)}" y="${f(H / 2 + fs * 0.5)}" text-anchor="middle" font-size="${f(fs * 1.5)}" font-weight="600" fill="${ink}">${r.ru}U</text>`;
  s += dim(0, H + fs * 1.1, W, H + fs * 1.1, g.known.W ? `${W} mm` : r.standard === '10' ? '10" rack' : 'width TBC', g.known.W);
  s += dim(-fs * 1.1, 0, -fs * 1.1, H, g.known.H ? `${H} mm` : `${r.ru}U`, g.known.H);
  // Side
  const sx = W + gap;
  s += `<g transform="translate(${f(sx)} 0)">${box(0, D)}`;
  if (g.enclosed && g.usable) {
    s += rect(g.inset, g.top, Math.min(g.usable, D - g.inset), uH, blue, ` opacity=".1"`) +
      rect(g.inset, g.top, Math.min(g.usable, D - g.inset), uH, 'none', ` stroke="${blue}" stroke-width="${f(fs * 0.08)}" stroke-dasharray="${f(fs * 0.4)} ${f(fs * 0.3)}"`);
    if (g.known.usable) s += `<text x="${f(g.inset + Math.min(g.usable, D - g.inset) / 2)}" y="${f(g.top + uH / 2 + fs * 0.4)}" text-anchor="middle" font-size="${f(fs)}" fill="${blue}" font-weight="600">${g.usable} mm usable</text>`;
  }
  s += dim(0, H + fs * 1.1, D, H + fs * 1.1, g.known.D ? `${D} mm` : 'depth TBC', g.known.D) + '</g>';
  const cap = (x: number, t: string) => `<text x="${f(x)}" y="${f(-fs * 0.9)}" text-anchor="middle" font-size="${f(fs * 0.8)}" fill="${muted}" letter-spacing="${f(fs * 0.04)}">${t}</text>`;
  s += cap(W / 2, 'FRONT') + cap(sx + D / 2, 'SIDE');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-pad)} ${f(-fs * 2.4)} ${f(sx + D + pad * 1.3)} ${f(H + fs * 5.6)}" role="img" aria-label="${r.name} dimensions" font-family="Inter,Arial,sans-serif">${s}</svg>`;
}

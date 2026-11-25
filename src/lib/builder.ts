// Rack Builder logic: turns a description of the customer's equipment into a
// recommended LDR cabinet (an existing SKU) plus the accessories that fit it.
import { racks, accessories, bySku, fits, usableDepth, type Rack, type Accessory, type RackType, type Range } from './catalog';
import type { FaceKind } from './art';

export type Placement = 'wall' | 'floor' | 'compact' | 'open';
export type RangePref = 'any' | Range;
export type DoorPref = 'any' | 'glass' | 'mesh';

export interface DeviceType {
  id: string; label: string; hint: string;
  group: 'network' | 'shelf' | 'av' | 'server';
  ru: number;            // rack units occupied (shelf devices: see SHELF_ZONE_U)
  depth: number;         // typical depth in mm, used for depth checks
  mount: 'rack' | 'shelf';
  outlets: number;       // power outlets needed
  zone: 'top' | 'middle' | 'bottom';
  supplySku?: string;    // LDR product that *is* this device (offered in the parts list)
}

export const DEVICES: DeviceType[] = [
  { id: 'patch',   group: 'network', label: 'Patch panel, 24-port',      hint: '1U', ru: 1, depth: 120, mount: 'rack',  outlets: 0, zone: 'top', supplySku: 'RCLDR-ACC-PP-24-6' },
  { id: 'cable',   group: 'network', label: 'Cable management rail',     hint: '1U', ru: 1, depth: 80,  mount: 'rack',  outlets: 0, zone: 'top', supplySku: 'RCLDR-ACC-CABLEMT' },
  { id: 'switch',  group: 'network', label: 'Network switch',            hint: '1U, ~250 mm deep', ru: 1, depth: 250, mount: 'rack', outlets: 1, zone: 'top' },
  { id: 'poe',     group: 'network', label: 'PoE switch',                hint: '1U, ~350 mm deep', ru: 1, depth: 350, mount: 'rack', outlets: 1, zone: 'top' },
  { id: 'router',  group: 'network', label: 'Router / firewall',         hint: '1U, ~300 mm deep', ru: 1, depth: 300, mount: 'rack', outlets: 1, zone: 'top' },
  { id: 'desktop', group: 'shelf',   label: 'Desktop box on a shelf',    hint: 'NBN/modem, small NVR, NAS', ru: 0, depth: 250, mount: 'shelf', outlets: 1, zone: 'middle' },
  { id: 'nvr',     group: 'av',      label: 'Rack-mount NVR / recorder', hint: '2U, ~400 mm deep', ru: 2, depth: 400, mount: 'rack', outlets: 1, zone: 'middle' },
  { id: 'av',      group: 'av',      label: 'AV amplifier / processor',  hint: '2U, ~400 mm deep', ru: 2, depth: 400, mount: 'rack', outlets: 1, zone: 'middle' },
  { id: 'server1', group: 'server',  label: 'Rack server, 1U',           hint: '~700 mm deep', ru: 1, depth: 700, mount: 'rack', outlets: 2, zone: 'middle' },
  { id: 'server2', group: 'server',  label: 'Rack server, 2U',           hint: '~700 mm deep', ru: 2, depth: 700, mount: 'rack', outlets: 2, zone: 'middle' },
  { id: 'ups',     group: 'server',  label: 'Rack-mount UPS',            hint: '2U, ~500 mm deep', ru: 2, depth: 500, mount: 'rack', outlets: 0, zone: 'bottom' },
];
export const deviceById = new Map(DEVICES.map((d) => [d.id, d]));
export const DEVICE_GROUPS: { id: DeviceType['group']; label: string }[] = [
  { id: 'network', label: 'Network & patching' },
  { id: 'shelf', label: 'On a shelf' },
  { id: 'av', label: 'Security & AV' },
  { id: 'server', label: 'Servers & power' },
];

/** Desktop devices sit on shelves; one 2U shelf zone holds up to two small boxes. */
export const SHELF_ZONE_U = 2;
export const BOXES_PER_SHELF = 2;

export const PRESETS: { id: string; label: string; text: string; placement: Placement; devices: Record<string, number> }[] = [
  { id: 'home',   label: 'Home / NBN',      text: 'Modem, a switch and a patch panel', placement: 'wall',  devices: { patch: 1, switch: 1, desktop: 1 } },
  { id: 'office', label: 'Small office',    text: 'Up to ~48 points with a firewall',   placement: 'wall',  devices: { patch: 2, cable: 1, switch: 2, router: 1, desktop: 1 } },
  { id: 'cctv',   label: 'CCTV',            text: 'PoE switch and recorder',           placement: 'wall',  devices: { patch: 1, poe: 1, nvr: 1 } },
  { id: 'av',     label: 'AV',              text: 'Amplifiers, players and a switch',  placement: 'wall',  devices: { switch: 1, av: 2, desktop: 2 } },
  { id: 'server', label: 'Server room',     text: 'Servers, UPS and core switching',   placement: 'floor', devices: { patch: 2, cable: 2, switch: 2, router: 1, server2: 2, ups: 1 } },
];

export interface BuilderInput {
  placement: Placement;
  devices: Record<string, number>;
  growth: number;          // 0, 0.25, 0.5
  range: RangePref;
  door: DoorPref;
  depthOverride: number | null;
  quiet: boolean;          // floor: noise-sensitive space → soundproof cabinets
  lockedRack: string | null;
  layout: string[] | null; // the customer's own arrangement (see "Layout"); null = arranged automatically
}

export const DEFAULT_INPUT: BuilderInput = {
  placement: 'wall', devices: { ...PRESETS[0].devices }, growth: 0.25, range: 'any', door: 'any',
  depthOverride: null, quiet: false, lockedRack: null, layout: null,
};

export const PLACEMENT_TYPES: Record<Placement, RackType[]> = {
  wall: ['wall', 'vertical'], floor: ['floor'], compact: ['mini'], open: ['open-frame', 'bracket'],
};

export interface Need {
  rackU: number; shelfZones: number; shelfBoxes: number; outlets: number; pduU: number;
  usedU: number; requiredU: number; deepest: number; deepestFrom: string | null;
}

export function pduPlan(rack: Rack | null, outlets: number, placement: Placement) {
  if (outlets === 0 || placement === 'compact' || placement === 'open') return { sku: null as string | null, qty: 0, u: 0, included: false };
  if (rack?.inBox.some((i) => /PDU/i.test(i)) && outlets <= 8) return { sku: null, qty: 0, u: 0, included: true };
  const vertical = rack ? rack.type === 'floor' || rack.type === 'soundproof' : placement === 'floor';
  if (vertical) return { sku: 'RCLDR-ACC-PDU10-10', qty: Math.ceil(outlets / 10), u: 0, included: false };
  return outlets <= 6 ? { sku: 'RCLDR-ACC-PDU10-6', qty: 1, u: 1, included: false } : { sku: 'RCLDR-ACC-PDU10-12', qty: Math.ceil(outlets / 12), u: 2 * Math.ceil(outlets / 12), included: false };
}

export function computeNeed(input: BuilderInput, rack: Rack | null = null): Need {
  let rackU = 0, shelfBoxes = 0, outlets = 0, deepest = 0, deepestFrom: string | null = null;
  for (const [id, qty] of Object.entries(input.devices)) {
    const d = deviceById.get(id);
    if (!d || qty <= 0) continue;
    if (d.mount === 'rack') rackU += d.ru * qty; else shelfBoxes += qty;
    outlets += d.outlets * qty;
    if (d.depth > deepest) { deepest = d.depth; deepestFrom = d.label; }
  }
  if (input.depthOverride) { deepest = input.depthOverride; deepestFrom = 'your deepest device'; }
  const shelfZones = Math.ceil(shelfBoxes / BOXES_PER_SHELF);
  const pduU = pduPlan(rack, outlets, input.placement).u;
  const usedU = rackU + shelfZones * SHELF_ZONE_U + pduU;
  const requiredU = Math.max(usedU, Math.ceil(usedU * (1 + input.growth)));
  return { rackU, shelfZones, shelfBoxes, outlets, pduU, usedU, requiredU, deepest, deepestFrom };
}

export interface Check { ok: boolean; id: 'space' | 'growth' | 'depth'; label: string; detail: string; estimated?: boolean }

export function checkRack(rack: Rack, input: BuilderInput): { checks: Check[]; need: Need; ok: boolean } {
  const need = computeNeed(input, rack);
  const ud = usableDepth(rack);
  const checks: Check[] = [
    { id: 'space', ok: rack.ru >= need.usedU, label: 'Fits your equipment', detail: `${need.usedU}U needed, ${rack.ru}U available` },
    { id: 'growth', ok: rack.ru >= need.requiredU, label: 'Room to grow', detail: rack.ru >= need.requiredU ? `${rack.ru - need.usedU}U spare` : `${need.requiredU}U wanted with growth allowance` },
  ];
  if (need.deepest > 0) {
    checks.push(ud.mm == null
      ? { id: 'depth', ok: true, estimated: true, label: 'Depth', detail: 'Mounting depth to be confirmed on the datasheet' }
      : { id: 'depth', ok: ud.mm >= need.deepest, estimated: ud.estimated, label: 'Depth',
          detail: `${need.deepest} mm deepest device, ${ud.estimated ? '~' : ''}${ud.mm} mm usable${ud.estimated ? ' (estimate)' : ''}` });
  }
  return { checks, need, ok: checks.every((c) => c.ok) };
}

function eligibleTypes(input: BuilderInput): RackType[] {
  if (input.placement === 'floor' && input.quiet) return ['soundproof'];
  return PLACEMENT_TYPES[input.placement];
}

export interface Recommendation {
  rack: Rack | null; best: Rack | null; alternatives: { rack: Rack; why: string }[];
  relaxed: string[]; need: Need; checks: Check[]; reasons: string[];
}

export function recommend(input: BuilderInput): Recommendation {
  const types = eligibleTypes(input);
  const base = racks.filter((r) => types.includes(r.type));
  const need0 = computeNeed(input);
  const depthOk = (r: Rack) => { const u = usableDepth(r).mm; return u == null || u >= need0.deepest; };
  const rangeOk = (r: Rack) => input.range === 'any' || r.range === input.range;
  const doorOk = (r: Rack) => input.door === 'any' || r.door === input.door;
  const sizeOk = (r: Rack) => r.ru >= computeNeed(input, r).requiredU;
  const rank = (a: Rack, b: Rack) =>
    a.ru - b.ru || (a.depth ?? 0) - (b.depth ?? 0) ||
    (usableDepth(a).estimated ? 1 : 0) - (usableDepth(b).estimated ? 1 : 0) || // prefer confirmed specs
    a.sku.localeCompare(b.sku);

  // Progressive relaxation so the customer never hits a dead end.
  const relaxed: string[] = [];
  let pool = base.filter((r) => sizeOk(r) && depthOk(r) && rangeOk(r) && doorOk(r));
  if (!pool.length && input.door !== 'any') { pool = base.filter((r) => sizeOk(r) && depthOk(r) && rangeOk(r)); if (pool.length) relaxed.push(`No ${input.door}-door option at this size, so door type was ignored.`); }
  if (!pool.length && input.range !== 'any') { pool = base.filter((r) => sizeOk(r) && depthOk(r)); if (pool.length) relaxed.push(`Nothing suitable in the ${input.range === 'carbon' ? 'Carbon' : 'LDR'} range, so both ranges are shown.`); }
  if (!pool.length) { pool = base.filter((r) => r.ru >= computeNeed(input, r).usedU && depthOk(r)); if (pool.length) relaxed.push('No cabinet leaves the growth allowance you asked for; this is the closest fit with less spare space.'); }
  if (!pool.length) {
    pool = [...base].sort((a, b) => b.ru - a.ru).slice(0, 1);
    const biggest = pool[0];
    if (biggest) relaxed.push(input.placement === 'wall' || input.placement === 'compact'
      ? `Your equipment needs more space than our largest ${input.placement === 'compact' ? '10" rack' : 'wall cabinet'} (${biggest.ru}U). Consider a floor cabinet.`
      : `Your equipment needs more space or depth than any single cabinet here. Consider splitting across two racks.`);
  }
  pool.sort(rank);

  const best = pool[0] ?? null;
  let rack = best;
  if (input.lockedRack) rack = (bySku.get(input.lockedRack) as Rack) ?? rack;

  const alternatives: { rack: Rack; why: string }[] = [];
  if (rack) {
    const bigger = base.filter((r) => r.ru > rack!.ru && r.range === rack!.range && depthOk(r) && doorOk(r)).sort(rank)[0];
    if (bigger) alternatives.push({ rack: bigger, why: `More room to grow (${bigger.ru}U)` });
    const eq = rack.equivalent ? (bySku.get(rack.equivalent) as Rack) : null;
    if (eq && eq.kind === 'rack') alternatives.push({ rack: eq, why: `Same size in the ${eq.range === 'carbon' ? 'Carbon' : 'LDR'} range` });
    const deeper = pool.find((r) => r !== rack && r.ru === rack!.ru && (r.depth ?? 0) > (rack!.depth ?? 0));
    if (deeper && alternatives.length < 3) alternatives.push({ rack: deeper, why: `Deeper (${deeper.depth} mm) for longer equipment` });
    const next = pool.find((r) => r !== rack && !alternatives.some((a) => a.rack === r));
    if (next && alternatives.length < 2) alternatives.push({ rack: next, why: 'Next closest match' });
  }

  const result = rack ? checkRack(rack, input) : { checks: [], need: need0 };
  const need = result.need;
  const reasons: string[] = [];
  if (rack) {
    reasons.push(`${need.usedU}U of equipment${need.shelfZones ? ` (including ${need.shelfZones} shelf${need.shelfZones > 1 ? 'ves' : ''})` : ''}${input.growth ? ` + ${Math.round(input.growth * 100)}% growth = ${need.requiredU}U` : ''}. This cabinet has ${rack.ru}U.`);
    const ud = usableDepth(rack);
    if (need.deepest && ud.mm) reasons.push(`Deepest item ~${need.deepest} mm (${need.deepestFrom}); ${ud.estimated ? 'estimated ' : ''}usable depth ${ud.mm} mm.`);
  }
  // A locked cabinet can only relax what was relaxed to find the best fit, so those notes don't apply to it.
  return { rack, best, alternatives: alternatives.slice(0, 3), relaxed: input.lockedRack && rack !== best ? [] : relaxed, need, checks: result.checks, reasons };
}

// ---------- Size choices ----------
export interface SizeOption { ru: number; rack: Rack; fits: boolean; count: number }

/** Every cabinet of one height for this placement, best match for the preferences first. */
export function variantsAt(input: BuilderInput, ru: number): Rack[] {
  const types = eligibleTypes(input), deepest = computeNeed(input).deepest;
  const score = (r: Rack) => {
    const u = usableDepth(r).mm;
    return (u == null || u >= deepest ? 0 : 4) + (input.range === 'any' || r.range === input.range ? 0 : 2) + (input.door === 'any' || r.door === input.door ? 0 : 1);
  };
  return racks.filter((r) => types.includes(r.type) && r.ru === ru).sort((a, b) =>
    score(a) - score(b) || (a.depth ?? 0) - (b.depth ?? 0) || (usableDepth(a).estimated ? 1 : 0) - (usableDepth(b).estimated ? 1 : 0) || a.sku.localeCompare(b.sku));
}

/** One entry per cabinet height available for this placement. */
export function sizeOptions(input: BuilderInput): SizeOption[] {
  const types = eligibleTypes(input);
  const sizes = [...new Set(racks.filter((r) => types.includes(r.type)).map((r) => r.ru))].sort((a, b) => a - b);
  return sizes.map((ru) => {
    const list = variantsAt(input, ru);
    return { ru, rack: list[0], count: list.length, fits: checkRack(list[0], input).checks.every((c) => c.ok || c.id === 'growth') };
  });
}

// ---------- Fit-out ----------
export interface Line { sku: string; qty: number; role: string; optional: boolean; defaultOn: boolean; note?: string }

function pick(list: Accessory[], rack: Rack, prefer: (a: Accessory) => number = () => 0) {
  return list.filter((a) => fits(a, rack)).sort((a, b) =>
    (a.range === rack.range ? 0 : 1) - (b.range === rack.range ? 0 : 1) || prefer(a) - prefer(b))[0] ?? null;
}

/** Greedy fill of spare U with blanking panels that fit the rack (largest first). */
function blanking(rack: Rack, spare: number): Line[] {
  if (spare <= 0) return [];
  const plates = accessories.filter((a) => a.group === 'blanking' && a.ru && fits(a, rack) && a.sku !== 'RCLDR-ACC-BLANKT-1U');
  // Same-range panels first (largest first), then the other range to cover any remainder.
  const sizes = [...plates].sort((a, b) => ((a.range === rack.range ? 0 : 1) - (b.range === rack.range ? 0 : 1)) || (b.ru! - a.ru!));
  const out = new Map<string, number>();
  let left = spare;
  for (const p of sizes) {
    if (out.size && [...out.keys()].some((k) => bySku.get(k)!.ru === p.ru)) continue; // one SKU per size
    const n = Math.floor(left / p.ru!);
    if (n > 0) { out.set(p.sku, n); left -= n * p.ru!; }
  }
  return [...out].map(([sku, qty]) => ({ sku, qty, role: 'Blanking for spare space', optional: true, defaultOn: true }));
}

export function fitOut(rack: Rack, input: BuilderInput, need: Need): Line[] {
  const lines: Line[] = [{ sku: rack.sku, qty: 1, role: 'Cabinet', optional: false, defaultOn: true }];

  // Devices LDR also supplies (patch panels, cable managers).
  for (const [id, qty] of Object.entries(input.devices)) {
    const d = deviceById.get(id);
    if (d?.supplySku && qty > 0 && rack.standard === '19') lines.push({ sku: d.supplySku, qty, role: d.label, optional: true, defaultOn: true });
  }

  // Shelves for desktop boxes.
  if (need.shelfZones > 0) {
    const shelf = pick(accessories.filter((a) => a.group === 'shelves'), rack,
      (a) => (rack.type === 'wall' ? (a.ru === 2 ? 0 : 1) : (a.ru === 1 ? 0 : 1)) + (a.sku.includes('SSHELF') ? 2 : 0));
    if (shelf) lines.push({ sku: shelf.sku, qty: need.shelfZones, role: `Shelf for ${need.shelfBoxes} desktop box${need.shelfBoxes > 1 ? 'es' : ''}`, optional: false, defaultOn: true });
  }

  // Power.
  const pdu = pduPlan(rack, need.outlets, input.placement);
  if (pdu.sku) lines.push({ sku: pdu.sku, qty: pdu.qty, role: `Power for ${need.outlets} outlet${need.outlets > 1 ? 's' : ''}`, optional: true, defaultOn: true });

  // Blanking panels manage airflow in enclosed cabinets; open frames and brackets don't need them.
  if (rack.type !== 'open-frame' && rack.type !== 'bracket') lines.push(...blanking(rack, rack.ru - need.usedU));

  // Cage nuts: 4 per rack-mounted U of equipment.
  const cage = accessories.find((a) => a.group === 'hardware' && /CAGENUT/.test(a.sku));
  const mountedU = need.rackU + need.pduU + need.shelfZones;
  if (cage && rack.standard === '19' && mountedU > 0) lines.push({ sku: cage.sku, qty: Math.max(1, Math.ceil((mountedU * 4) / 50)), role: 'Mounting hardware', optional: true, defaultOn: true });

  // Optional extras.
  if (rack.type === 'wall' && rack.range === 'classic') {
    const fan = bySku.get('RCLDR-ACC-2FAN') as Accessory | undefined;
    if (fan && fits(fan, rack)) lines.push({ sku: fan.sku, qty: 1, role: 'Extra ventilation', optional: true, defaultOn: false });
  }
  if (rack.type === 'floor') {
    const plinth = accessories.find((a) => a.group === 'floor' && /PLINTH/.test(a.sku) && fits(a, rack));
    if (plinth) lines.push({ sku: plinth.sku, qty: 1, role: 'Floor plinth', optional: true, defaultOn: false });
    const wheels = bySku.get('RCLDR-ACC-WHEEL') as Accessory | undefined;
    if (wheels && rack.range === 'classic') lines.push({ sku: wheels.sku, qty: 1, role: 'Castors', optional: true, defaultOn: false });
    const vcm = accessories.find((a) => a.group === 'cable' && /VCM/.test(a.sku) && fits(a, rack));
    if (vcm) lines.push({ sku: vcm.sku, qty: 1, role: 'Vertical cable management', optional: true, defaultOn: false });
  }
  return lines;
}

// ---------- Layout (what sits where in the rack) ----------
// The rack holds two stacks: one hanging from the top and one standing on the bottom, with the
// spare space between them. A layout is the sequence of tokens (a device id, 'shelf' or 'pdu')
// from top to bottom, with GAP marking where the spare space goes. Equipment of one type is
// interchangeable, so the sequence is all there is to store.
export const GAP = '|';
export type SlotKind = 'device' | 'shelf' | 'pdu' | 'blank' | 'free';
export interface Placed {
  id: string; kind: SlotKind; token: string; face: FaceKind | null; label: string;
  ru: number;        // height in rack units
  u: number;         // highest unit occupied; units count up from 1 at the bottom
  depth: number;     // mm
  seq: number;       // position in the layout sequence; -1 for blanking panels and free space
  ldr: boolean;      // an LDR part on the parts list, rather than the customer's own equipment
  sku?: string; boxes?: number;
}
export interface Arrangement { items: Placed[]; seq: string[]; unplaced: Placed[]; spare: number }

const TOP_RANK: Record<string, number> = { patch: 0, cable: 0, switch: 0, poe: 0, router: 1, shelf: 2 };
const BOTTOM_FIRST = new Set(['pdu', ...DEVICES.filter((d) => d.zone === 'bottom').map((d) => d.id)]);
const rankOf = (token: string) => TOP_RANK[token] ?? 3;
const isToken = (t: string) => t === GAP || t === 'shelf' || t === 'pdu' || deviceById.get(t)?.mount === 'rack';

function tokenCounts(rack: Rack, input: BuilderInput, need: Need, lines: Line[], enabled: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of DEVICES) if (d.mount === 'rack' && (input.devices[d.id] ?? 0) > 0) counts.set(d.id, input.devices[d.id]);
  if (need.shelfZones) counts.set('shelf', need.shelfZones);
  const pdu = lines.find((l) => l.sku.includes('PDU') && enabled.has(l.sku));
  const pduU = pdu ? (bySku.get(pdu.sku) as Accessory).ru ?? 0 : 0;
  if (pdu && pduU && rack.type !== 'floor' && rack.type !== 'soundproof') counts.set('pdu', pdu.qty);
  return counts;
}

/** The arrangement an installer would usually choose: patching and switching at the top, heavy gear low. */
function defaultSeq(counts: Map<string, number>): string[] {
  const take = (t: string) => Array.from({ length: counts.get(t) ?? 0 }, () => t);
  const top: string[] = [];
  const lanes = [take('patch'), take('cable'), [...take('switch'), ...take('poe')]];
  while (lanes.some((l) => l.length)) for (const l of lanes) { const t = l.shift(); if (t) top.push(t); }
  top.push(...take('router'), ...take('shelf'));
  for (const d of DEVICES) if (d.zone === 'middle' && d.mount === 'rack') top.push(...take(d.id));
  const bottom = [...take('pdu')];
  for (const d of DEVICES) if (d.zone === 'bottom') bottom.push(...take(d.id));
  return [...top, GAP, ...bottom];
}

/** Keeps the customer's order, dropping what was removed and slotting in what was added. */
function reconcile(layout: string[], counts: Map<string, number>): string[] {
  const seq = layout.filter((t, i) => (t === GAP ? layout.indexOf(GAP) === i : counts.has(t)));
  if (!seq.includes(GAP)) seq.push(GAP);
  for (const [token, want] of counts) {
    let have = seq.filter((t) => t === token).length;
    for (; have > want; have--) seq.splice(seq.lastIndexOf(token), 1);
    for (; have < want; have++) {
      const gap = seq.indexOf(GAP);
      if (BOTTOM_FIRST.has(token)) { seq.splice(token === 'pdu' ? gap + 1 : seq.length, 0, token); continue; }
      const at = seq.findIndex((t, i) => i < gap && rankOf(t) > rankOf(token));
      seq.splice(at === -1 ? gap : at, 0, token);
    }
  }
  return seq;
}

export function arrange(rack: Rack, input: BuilderInput, need: Need, lines: Line[], enabled: Set<string>): Arrangement {
  const counts = tokenCounts(rack, input, need, lines, enabled);
  const seq = input.layout ? reconcile(input.layout, counts) : defaultSeq(counts);
  const shelfLine = lines.find((l) => l.role.startsWith('Shelf'));
  const pduLine = lines.find((l) => l.sku.includes('PDU'));
  const seen = new Map<string, number>();
  const make = (token: string, index: number): Placed => {
    const n = seen.get(token) ?? 0;
    seen.set(token, n + 1);
    const base = { id: `${token}#${n}`, token, seq: index, u: 0 };
    if (token === 'shelf') {
      const boxes = Math.min(BOXES_PER_SHELF, need.shelfBoxes - n * BOXES_PER_SHELF);
      const shelf = shelfLine ? (bySku.get(shelfLine.sku) as Accessory) : null;
      return { ...base, kind: 'shelf', face: 'shelf', label: `Shelf with ${boxes} desktop box${boxes > 1 ? 'es' : ''}`, ru: SHELF_ZONE_U, depth: shelf?.shelfDepth ?? 275, ldr: true, sku: shelfLine?.sku, boxes };
    }
    if (token === 'pdu') {
      const acc = bySku.get(pduLine!.sku) as Accessory;
      return { ...base, kind: 'pdu', face: 'pdu', label: `PDU, ${acc.outlets}-outlet`, ru: acc.ru ?? 1, depth: 60, ldr: true, sku: acc.sku };
    }
    const d = deviceById.get(token)!;
    const supplied = !!d.supplySku && enabled.has(d.supplySku);
    return { ...base, kind: 'device', face: d.id as FaceKind, label: d.label.replace(/, (24-port|\dU)$/, ''), ru: d.ru, depth: d.depth, ldr: supplied, sku: supplied ? d.supplySku : undefined };
  };
  const gap = seq.indexOf(GAP);
  const top = seq.slice(0, gap).map((t, i) => make(t, i));
  const bottom = seq.slice(gap + 1).map((t, i) => make(t, gap + 1 + i));

  const items: Placed[] = [], unplaced: Placed[] = [];
  let u = rack.ru;                                    // next free unit under the top stack
  for (const it of top) { if (u - it.ru >= 0) { items.push({ ...it, u }); u -= it.ru; } else unplaced.push(it); }
  let floor = 0;                                      // units taken by the bottom stack
  const stand: Placed[] = [];
  for (const it of [...bottom].reverse()) { if (floor + it.ru <= u) { floor += it.ru; stand.unshift({ ...it, u: floor }); } else unplaced.push(it); }

  const spare = u - floor;
  let left = spare, n = 0;
  const blanks = lines.filter((l) => l.role.startsWith('Blanking') && enabled.has(l.sku))
    .map((l) => ({ line: l, acc: bySku.get(l.sku) as Accessory })).sort((a, b) => (b.acc.ru ?? 1) - (a.acc.ru ?? 1));
  for (const { line, acc } of blanks) {
    const h = acc.ru ?? 1;
    for (let i = 0; i < line.qty && left >= h; i++, n++) {
      items.push({ id: `blank#${n}`, kind: 'blank', token: 'blank', face: 'blank', label: 'Blanking panel', ru: h, u, depth: 4, seq: -1, ldr: true, sku: acc.sku });
      u -= h; left -= h;
    }
  }
  if (left > 0) items.push({ id: 'free', kind: 'free', token: 'free', face: null, label: `${left}U free`, ru: left, u, depth: 0, seq: -1, ldr: false });
  items.push(...stand);
  return { items, seq, unplaced, spare };
}

/** Moves the token at `from` so it ends up at index `to` of the sequence left after removing it. */
export function moveToken(seq: string[], from: number, to: number): string[] {
  const next = [...seq];
  const [token] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, token);
  return next;
}
/** The id arrange() gives the token at `index`. */
export const idAt = (seq: string[], index: number) => `${seq[index]}#${seq.slice(0, index).filter((t) => t === seq[index]).length}`;

// ---------- URL state ----------
export function encodeInput(i: BuilderInput): string {
  const sp = new URLSearchParams();
  sp.set('place', i.placement);
  const dev = Object.entries(i.devices).filter(([, q]) => q > 0).map(([k, q]) => `${k}:${q}`).join(',');
  if (dev) sp.set('dev', dev);
  sp.set('grow', String(Math.round(i.growth * 100)));
  if (i.range !== 'any') sp.set('range', i.range);
  if (i.door !== 'any') sp.set('door', i.door);
  if (i.depthOverride) sp.set('depth', String(i.depthOverride));
  if (i.quiet) sp.set('quiet', '1');
  if (i.lockedRack) sp.set('rack', i.lockedRack);
  if (i.layout) sp.set('lay', i.layout.map((t) => (t === GAP ? '_' : t)).join('.'));
  return sp.toString();
}

export function decodeInput(search: string): BuilderInput | null {
  const sp = new URLSearchParams(search);
  if (![...sp.keys()].length) return null;
  const lockedRack = sp.get('rack');
  const locked = lockedRack ? (bySku.get(lockedRack) as Rack | undefined) : undefined;
  const placeFromRack: Placement | null = locked?.kind === 'rack'
    ? (locked.type === 'floor' || locked.type === 'soundproof' ? 'floor' : locked.type === 'mini' ? 'compact' : ['open-frame', 'bracket'].includes(locked.type) ? 'open' : 'wall')
    : null;
  const devices: Record<string, number> = {};
  for (const part of (sp.get('dev') ?? '').split(',').filter(Boolean)) {
    const [k, q] = part.split(':');
    if (deviceById.has(k)) devices[k] = Math.max(0, Math.min(40, parseInt(q, 10) || 0));
  }
  const place = sp.get('place') as Placement | null;
  const lay = (sp.get('lay') ?? '').split('.').map((t) => (t === '_' ? GAP : t)).filter(isToken);
  return {
    ...DEFAULT_INPUT,
    placement: placeFromRack ?? (place && place in PLACEMENT_TYPES ? place : DEFAULT_INPUT.placement),
    devices: sp.has('dev') ? devices : { ...DEFAULT_INPUT.devices },
    growth: sp.has('grow') ? Math.min(1, Math.max(0, (parseInt(sp.get('grow')!, 10) || 0) / 100)) : DEFAULT_INPUT.growth,
    range: (['carbon', 'classic'].includes(sp.get('range') ?? '') ? sp.get('range') : 'any') as RangePref,
    door: (['glass', 'mesh'].includes(sp.get('door') ?? '') ? sp.get('door') : 'any') as DoorPref,
    depthOverride: sp.get('depth') ? parseInt(sp.get('depth')!, 10) || null : null,
    quiet: sp.get('quiet') === '1',
    lockedRack: locked?.kind === 'rack' ? locked.sku : null,
    layout: lay.length ? lay : null,
  };
}

import data from '../data/catalog.json';

export type Range = 'carbon' | 'classic';
export type RackType = 'wall' | 'floor' | 'mini' | 'vertical' | 'open-frame' | 'bracket' | 'soundproof';
export type AccGroup = 'shelves' | 'blanking' | 'power' | 'patching' | 'cable' | 'cooling' | 'doors' | 'floor' | 'hardware';

interface Base {
  sku: string; slug: string; range: Range; name: string; leaderName?: string;
  summary: string; specs: [string, string][]; features: string[]; shipping: [string, string][];
  rrp: number | null; stock: Record<string, number> | null; stockTotal: number | null;
  datasheet: string | null; image: string | null; gallery: string[];
  warrantyMonths: number | null; isNew: boolean; equivalent: string | null;
}
export interface Rack extends Base {
  kind: 'rack'; type: RackType; ru: number; width: number | null; depth: number | null;
  door: 'glass' | 'mesh' | null; colour: string; style: string | null; standard: '19' | '10';
  inBox: string[]; mountDepth: number | null; heightMm: number | null; loadKg: number | null;
}
export interface Fit {
  standard: '19' | '10'; depthRange?: [number, number]; types?: RackType[]; ru?: number[];
  width?: number[]; depth?: number[]; range?: Range;
}
export interface Accessory extends Base {
  kind: 'accessory'; group: AccGroup; ru: number | null; shelfDepth: number | null; outlets: number | null; fit: Fit;
}
export type Product = Rack | Accessory;

export const products = data.products as unknown as Product[];
export const racks = products.filter((p): p is Rack => p.kind === 'rack');
export const accessories = products.filter((p): p is Accessory => p.kind === 'accessory');
export const bySku = new Map(products.map((p) => [p.sku, p]));

export const TYPE_LABEL: Record<RackType, string> = {
  wall: 'Wall cabinets', floor: 'Floor cabinets', mini: '10" mini racks', vertical: 'Vertical wall cabinets',
  'open-frame': 'Open-frame racks', bracket: 'Wall brackets', soundproof: 'Soundproof cabinets',
};
export const GROUP_LABEL: Record<AccGroup, string> = {
  shelves: 'Shelves', blanking: 'Blanking panels', power: 'Power (PDUs)', patching: 'Patch panels',
  cable: 'Cable management', cooling: 'Cooling', doors: 'Spare doors', floor: 'Floor fit-out', hardware: 'Hardware & locks',
};
export const RANGE_LABEL: Record<Range, string> = { carbon: 'Carbon', classic: 'LDR' };

/** Usable mounting depth. Falls back to an estimate (external − 100 mm) when the datasheet value is unknown. */
export function usableDepth(r: Rack): { mm: number | null; estimated: boolean } {
  if (r.mountDepth) return { mm: r.mountDepth, estimated: false };
  if (r.depth) return { mm: r.depth - 100, estimated: true };
  return { mm: null, estimated: true };
}

export function fits(acc: Accessory, rack: Rack): boolean {
  const f = acc.fit;
  if (f.standard !== rack.standard) return false;
  if (rack.type === 'mini') return f.standard === '10';
  if (f.types && !f.types.includes(rack.type)) return false;
  if (!f.types && !['wall', 'floor', 'open-frame', 'soundproof', 'bracket', 'vertical'].includes(rack.type)) return false;
  if (f.range && f.range !== rack.range) return false;
  if (f.ru && !f.ru.includes(rack.ru)) return false;
  if (f.width && (rack.width == null || !f.width.includes(rack.width))) return false;
  if (f.depth && (rack.depth == null || !f.depth.includes(rack.depth))) return false;
  if (f.depthRange) {
    if (rack.depth == null) return false;
    if (rack.depth < f.depthRange[0] || rack.depth > f.depthRange[1]) return false;
  }
  // Shelves without a depth rule (none today) and brackets/open frames: no shelves deeper than the frame.
  if (acc.group === 'shelves' && ['bracket', 'open-frame', 'vertical'].includes(rack.type)) return false;
  return true;
}

export const compatibleAccessories = (rack: Rack) =>
  accessories.filter((a) => fits(a, rack)).sort((a, b) => (a.range === rack.range ? -1 : 1) - (b.range === rack.range ? -1 : 1));
export const compatibleRacks = (acc: Accessory) => racks.filter((r) => fits(acc, r));

export const formatRRP = (p: Product) => (p.rrp != null ? `$${p.rrp.toLocaleString('en-AU', { minimumFractionDigits: p.rrp % 1 ? 2 : 0 })}` : null);

export function keySpecs(p: Product): string {
  if (p.kind === 'rack') {
    const parts = [`${p.ru}U`];
    if (p.type === 'mini') parts.push('10"');
    if (p.width && p.depth) parts.push(`${p.width} × ${p.depth} mm`);
    if (p.door) parts.push(`${p.door} door`);
    return parts.join(' · ');
  }
  const parts: string[] = [];
  if (p.ru) parts.push(`${p.ru}U`);
  if (p.fit.standard === '10') parts.push('10"');
  if (p.fit.depthRange) parts.push(`for ${p.fit.depthRange[0] === p.fit.depthRange[1] ? p.fit.depthRange[0] : p.fit.depthRange.join('–')} mm deep`);
  return parts.join(' · ');
}

export const productUrl = (p: Product) => `/products/${p.slug}`;

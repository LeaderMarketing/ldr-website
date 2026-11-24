// Builds src/data/catalog.json from:
//   src/data/source/leader-existing.json  (live Leader Dealer Shop data, refreshed by sync-leader.ps1)
//   src/data/source/carbon.json           (new Carbon range, not yet in Dealer Shop)
// Run: node scripts/build-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8').replace(/^﻿/, ''));
const leader = read('../src/data/source/leader-existing.json');
const carbon = read('../src/data/source/carbon.json');

const IMAGE_BASE = 'https://www.leadersystems.com.au/Images/';

// ---------- Fit rules ----------
// Shelf → cabinet external depths it is recommended for. Classic values come from
// Leader's product names; Carbon values mirror the equivalent classic part and are
// guidance until the Carbon datasheets confirm them.
const SHELF_DEPTH_FIT = {
  'RCLDR-ACC-FSHELF275': [450, 550], 'RCLDR-ACC-CSHELF275': [450, 550],
  'RCLDR-ACC-FSHELF350': [600, 600], 'RCLDR-ACC-CSHELF300': [600, 600],
  'RCLDR-ACC-FSHELF550': [800, 800], 'RCLDR-ACC-CSHELF452': [1000, 1000],
  'RCLDR-ACC-ASHELF800': [600, 800], 'RCLDR-ACC-SSHELF500': [450, 600],
  'RCLDR-ACC-FSHELF275-CARBON': [450, 550], 'RCLDR-ACC-CSHELF275-CARBON': [450, 550],
  'RCLDR-ACC-CSHELF300-CARBON': [600, 600], 'RCLDR-ACC-SSHELF500-CARBON': [600, 800],
  'RCLDR-ACC-FSHELF750-CARBON': [1000, 1100], 'RCLDR-ACC-SSHELF750-CARBON': [1000, 1100],
};
const RACK_19_TYPES = ['wall', 'floor', 'open-frame', 'soundproof', 'bracket', 'vertical'];

// ---------- Helpers ----------
const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\r/g, '').replace(/‑/g, '-');
const num = (s) => { const m = String(s ?? '').match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };

function parseDescription(raw) {
  const text = stripHtml(raw);
  const lines = text.split('\n').map((l) => l.trim());
  const specs = [], features = [], shipping = [];
  let section = 'intro';
  const intro = [];
  for (const line of lines) {
    if (!line) continue;
    if (/^features\s*:?/i.test(line)) { section = 'features'; continue; }
    if (/^specifications\s*:?/i.test(line)) { section = 'specs'; continue; }
    if (/^data sheet/i.test(line)) continue;
    const bullet = line.replace(/^[•\-*]\s*/, '');
    if (section === 'intro') { if (!/^description:?$/i.test(line)) intro.push(line.replace(/^description:\s*/i, '')); continue; }
    if (section === 'features') { if (line.startsWith('•')) features.push(bullet); continue; }
    if (section === 'specs' && line.startsWith('•')) {
      const parts = bullet.split(/\t+|\s{2,}|:\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const [label, ...rest] = parts;
      const value = rest.join(' ').replace(/(\d)mm/g, '$1 mm').replace(/(\d)kgs?\b/g, '$1 kg');
      if (/shipping|carton/i.test(label)) shipping.push([label, value]); else specs.push([label, value]);
    }
  }
  const summary = intro.filter((l) => !/^LDR .*RCLDR-/.test(l)).join(' ').split(/(?<=\.)\s+/).slice(0, 2).join(' ');
  return { summary, specs, features, shipping };
}
const specVal = (specs, re) => specs.find(([l]) => re.test(l))?.[1] ?? null;

// ---------- Classic (existing) range ----------
const CLASSIC_ACC = {
  'RCLDR-ACC-2FAN':       ['cooling',  '2-way fan kit for wall cabinets'],
  'RCLDR-ACC-2FANRM':     ['cooling',  '1U rack-mount fan kit, 2 fans with switch'],
  'RCLDR-ACC-THERMO':     ['cooling',  'Auto fan thermostat, DIN rail'],
  'RCLDR-ACC-ASHELF800':  ['shelves',  'Adjustable shelf 1U, 445–800 mm'],
  'RCLDR-ACC-CSHELF275':  ['shelves',  'Cantilever shelf 2U, 275 mm'],
  'RCLDR-ACC-CSHELF300':  ['shelves',  'Cantilever shelf 2U, 300 mm'],
  'RCLDR-ACC-CSHELF452':  ['shelves',  'Cantilever shelf 2U, 452 mm'],
  'RCLDR-ACC-FSHELF275':  ['shelves',  'Fixed shelf 1U, 275 mm'],
  'RCLDR-ACC-FSHELF350':  ['shelves',  'Fixed shelf 1U, 350 mm'],
  'RCLDR-ACC-FSHELF550':  ['shelves',  'Fixed shelf 1U, 550 mm'],
  'RCLDR-ACC-SSHELF500':  ['shelves',  'Sliding shelf 1U, 500 mm'],
  'RCLDR-ACC-BLANK-1U':   ['blanking', 'Blanking panel 1U'],
  'RCLDR-ACC-BLANK-2U':   ['blanking', 'Blanking panel 2U'],
  'RCLDR-ACC-BLANKT-1U':  ['blanking', 'Tool-less snap-in blanking panel 1U'],
  'RCLDR-ACC-BRUSH-1U':   ['cable',    'Brush panel 1U'],
  'RCLDR-ACC-CABLEMT':    ['cable',    'Cable management rail 1U, 24 slot'],
  'RCLDR-ACC-DINRAIL':    ['hardware', 'Rack-mount 35 mm DIN rail'],
  'RCLDR-ACC-WHEEL':      ['floor',    'Caster wheels, pack of 4 (2 braked)'],
  'RCLDR-ACC-PDU10-6':    ['power',    'PDU 6-outlet, 10 A, horizontal 1U'],
  'RCLDR-ACC-PDU10-8':    ['power',    'PDU 8-outlet, 10 A, vertical'],
  'RCLDR-ACC-PDU10-10':   ['power',    'PDU 10-outlet, 10 A, vertical'],
  'RCLDR-ACC-PDU10-12':   ['power',    'PDU 12-outlet, 10 A, horizontal 2U'],
  'RCLDR-ACC-PDU10-9IEC': ['power',    'PDU 9 × IEC C13, 10 A, vertical'],
  'RCLDR-ACC-PP-24-6':    ['patching', 'Patch panel 24-port Cat6/5e, 1U'],
  'RCLDR-ACC-PP-24-6A':   ['patching', 'Patch panel 24-port Cat6A UTP, 1U'],
};
const ACC_RU = { 'RCLDR-ACC-2FANRM': 1, 'RCLDR-ACC-BLANK-1U': 1, 'RCLDR-ACC-BLANK-2U': 2, 'RCLDR-ACC-BLANKT-1U': 1,
  'RCLDR-ACC-BRUSH-1U': 1, 'RCLDR-ACC-CABLEMT': 1, 'RCLDR-ACC-PDU10-6': 1, 'RCLDR-ACC-PDU10-12': 2,
  'RCLDR-ACC-PP-24-6': 1, 'RCLDR-ACC-PP-24-6A': 1, 'RCLDR-ACC-DINRAIL': 1,
  'RCLDR-ACC-ASHELF800': 1, 'RCLDR-ACC-CSHELF275': 2, 'RCLDR-ACC-CSHELF300': 2, 'RCLDR-ACC-CSHELF452': 2,
  'RCLDR-ACC-FSHELF275': 1, 'RCLDR-ACC-FSHELF350': 1, 'RCLDR-ACC-FSHELF550': 1, 'RCLDR-ACC-SSHELF500': 1 };
const PDU_OUTLETS = { 'RCLDR-ACC-PDU10-6': 6, 'RCLDR-ACC-PDU10-8': 8, 'RCLDR-ACC-PDU10-10': 10, 'RCLDR-ACC-PDU10-12': 12, 'RCLDR-ACC-PDU10-9IEC': 9 };

function classicRackType(sku) {
  if (/-(SS450|DS550)-/.test(sku)) return 'wall';
  if (/-FS\d+-/.test(sku)) return 'floor';
  if (/-WB-FT$/.test(sku)) return 'vertical';
  if (/-OF\d+-|-2P600-/.test(sku)) return 'open-frame';
  if (/-SN03-/.test(sku)) return 'soundproof';
  return null;
}

const products = [];

for (const p of leader) {
  const sku = p.PartNum;
  const d = parseDescription(p.ProductDescription);
  const stock = { NSW: p.AvailNsw, VIC: p.AvailVic, QLD: p.AvailQld, SA: p.AvailSa, WA: p.AvailWa };
  const base = {
    sku, slug: sku.toLowerCase(), range: 'classic', leaderName: p.ProductName,
    summary: d.summary, specs: d.specs, features: d.features, shipping: d.shipping,
    rrp: p.RRPInc ?? null, stock, stockTotal: Object.values(stock).reduce((a, b) => a + (b || 0), 0),
    datasheet: p.VendorURL && /\.pdf$/i.test(p.VendorURL) ? p.VendorURL : null,
    image: `${IMAGE_BASE}${sku}.jpg`,
    gallery: p.Image2 ? [2, 3, 4].map((i) => `${IMAGE_BASE}${sku}_${i}.jpg`) : [],
    warrantyMonths: p.WarrantyM ?? null, isNew: false,
  };

  if (CLASSIC_ACC[sku]) {
    const [group, name] = CLASSIC_ACC[sku];
    const fit = { standard: '19' };
    if (SHELF_DEPTH_FIT[sku]) fit.depthRange = SHELF_DEPTH_FIT[sku];
    if (sku === 'RCLDR-ACC-2FAN') { fit.types = ['wall']; fit.range = 'classic'; }
    if (sku === 'RCLDR-ACC-WHEEL') fit.types = ['floor'];
    products.push({ ...base, kind: 'accessory', group, name, ru: ACC_RU[sku] ?? null,
      outlets: PDU_OUTLETS[sku] ?? null, shelfDepth: num(name.match(/(\d+)\s*mm/)?.[1]), fit });
    continue;
  }

  // Leader's main rack image is a labelled marketing tile; the _2 gallery shot is a
  // clean product photo, so lead with that and keep the tile in the gallery.
  if (p.Image2) {
    base.image = `${IMAGE_BASE}${sku}_2.jpg`;
    base.gallery = [`${IMAGE_BASE}${sku}_3.jpg`, `${IMAGE_BASE}${sku}_4.jpg`, `${IMAGE_BASE}${sku}.jpg`];
  }
  const type = classicRackType(sku);
  const ru = num(sku.match(/-(\d+)U/)?.[1]) ?? num(specVal(d.specs, /nominal height/i));
  const dims = p.ProductName.match(/(\d{3,4})mm\s*x\s*(\d{3,4})mm/i) || p.ProductName.match(/W?(\d{3,4})mm\s*x\s*W?(\d{3,4})mm/i);
  let width = dims ? Number(dims[1]) : num(specVal(d.specs, /outer width|product width/i));
  let depth = dims ? Number(dims[2]) : num(specVal(d.specs, /outer depth|product length/i));
  if (sku === 'RCLDR-FS1000-22U-A') { width = 600; depth = 1000; } // name lists L600 x W1000
  if (sku === 'RCLDR-WB-FT') { width = 570; depth = 250; }
  const door = /glass door/i.test(p.ProductName) || /front doors?\s*glass/i.test(specVal(d.specs, /front door/i) ?? '') ? 'glass' : null;
  const colour = /white/i.test(p.ProductName) ? 'White' : /wood/i.test(p.ProductName) ? 'Black / wood' : 'Black';
  const inBox = [];
  if (/8-Port PDU/i.test(p.ProductName)) inBox.push('8-port PDU');
  if (/4-Way Fan/i.test(p.ProductName)) inBox.push('4-way roof fan');
  if (/2x Fixed Shelves/i.test(p.ProductName)) inBox.push('2 fixed shelves');
  if (/Low Noise Fans/i.test(p.ProductName)) inBox.push('Low-noise fans');
  const style = /-DS550-/.test(sku) ? 'Hinged (double section)' : /-SS450-/.test(sku) ? 'Single section' : /2-Post/i.test(p.ProductName) ? '2-post open frame' : /Flat Pack/i.test(p.ProductName) ? 'Flat pack' : null;
  const typeLabel = { wall: 'wall cabinet', floor: 'floor cabinet', vertical: 'vertical wall cabinet', 'open-frame': 'open-frame rack', soundproof: 'soundproof cabinet' }[type];
  products.push({
    ...base, kind: 'rack', type, ru, width, depth, door, colour, style, inBox,
    name: `${ru}U ${typeLabel}`,
    mountDepth: num(specVal(d.specs, /mounting depth/i)),
    heightMm: num(specVal(d.specs, /outer height|product height/i)),
    loadKg: num(specVal(d.specs, /load capacity/i)),
    standard: '19',
  });
}

// ---------- Carbon range ----------
for (const r of carbon.racks) {
  const typeLabel = { wall: 'wall cabinet', floor: 'floor cabinet', mini: '10" mini rack', vertical: 'vertical wall cabinet', bracket: 'fold-down wall bracket' }[r.type];
  products.push({
    sku: r.sku, slug: r.sku.toLowerCase(), range: 'carbon', kind: 'rack', type: r.type,
    name: `${r.ru}U Carbon ${typeLabel}`, ru: r.ru, width: r.width ?? null, depth: r.depth ?? null,
    door: r.door, colour: 'Charcoal', style: r.type === 'floor' && r.width === 800 ? 'Wide (800 mm)' : null,
    standard: r.type === 'mini' ? '10' : '19', inBox: [],
    mountDepth: null, heightMm: null, loadKg: null,
    summary: '', specs: [], features: [], shipping: [],
    rrp: null, stock: null, stockTotal: null, datasheet: null, image: null, gallery: [],
    warrantyMonths: null, isNew: true,
  });
}
for (const a of carbon.accessories) {
  const fit = { standard: a.standard ?? '19' };
  if (SHELF_DEPTH_FIT[a.sku]) fit.depthRange = SHELF_DEPTH_FIT[a.sku];
  if (a.fitsTypes) fit.types = a.fitsTypes;
  if (a.fitsRu) fit.ru = a.fitsRu;
  if (a.fitsWidth) fit.width = a.fitsWidth;
  if (a.fitsDepth) fit.depth = a.fitsDepth;
  if (a.group === 'doors') fit.range = 'carbon';
  products.push({
    sku: a.sku, slug: a.sku.toLowerCase(), range: 'carbon', kind: 'accessory', group: a.group,
    name: a.name, ru: a.ru ?? null, shelfDepth: a.shelfDepth ?? null, outlets: null, fit,
    summary: '', specs: [], features: [], shipping: [],
    rrp: null, stock: null, stockTotal: null, datasheet: null, image: null, gallery: [],
    warrantyMonths: null, isNew: true,
  });
}

// ---------- Cross references ----------
// Carbon ↔ classic equivalents share the same base code (e.g. SS450-9U).
const baseCode = (sku) => sku.replace(/^RCLDR-/, '').replace(/-CARBON$/, '').replace(/-A(-W)?$/, '');
for (const p of products) {
  const other = products.find((q) => q !== p && q.range !== p.range && baseCode(q.sku) === baseCode(p.sku));
  p.equivalent = other ? other.sku : null;
}

const typeOrder = ['wall', 'floor', 'mini', 'vertical', 'open-frame', 'bracket', 'soundproof'];
products.sort((a, b) =>
  (a.kind === b.kind ? 0 : a.kind === 'rack' ? -1 : 1) ||
  (typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)) ||
  (a.group ?? '').localeCompare(b.group ?? '') ||
  (a.ru ?? 0) - (b.ru ?? 0) || (a.depth ?? 0) - (b.depth ?? 0) ||
  (a.range === b.range ? 0 : a.range === 'classic' ? -1 : 1) || a.sku.localeCompare(b.sku));

const out = { generated: new Date().toISOString(), count: products.length, products };
writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`catalog.json: ${products.length} products (${products.filter((p) => p.range === 'carbon').length} Carbon, ${products.filter((p) => p.range === 'classic').length} classic)`);

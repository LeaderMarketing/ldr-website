# LDR website

Catalogue and Rack Builder for LDR data racks (existing range + new Carbon range).

**Stack:** [Astro 5](https://astro.build) (static, multipage) with a single React island for the Rack Builder. No CSS framework; tokens live in `src/styles/global.css`.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # rebuilds catalog.json, then the static site into dist/
npm run sync       # refresh existing-range data from Leader Dealer Shop (needs the `leader` CLI)
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Home: shop by type, Rack Builder intro, Carbon intro, where to buy |
| `/products` | Catalogue with filters (range, type, U, width, depth, door), search and sort. Filter state is kept in the URL. |
| `/products/[sku]` | Product page: key facts, specs, datasheet, "fits this cabinet" / "fits these cabinets", Carbon↔LDR equivalent, other sizes |
| `/carbon` | Carbon range overview |
| `/rack-builder` | Rack Builder (see below) |
| `/quote` | Quote request. Prefilled from `?items=SKU:qty,...` (product pages and builder) |
| `/support`, `/where-to-buy`, `/about`, `404` | Supporting content |

## Data flow

```
leader CLI ──sync-leader.ps1──▶ src/data/source/leader-existing.json ─┐
carbon sku list ─────────────▶ src/data/source/carbon.json ───────────┼─ scripts/build-catalog.mjs ─▶ src/data/catalog.json
                                                                       ┘
```

- **Existing range (43 SKUs):** names, RRP, specs (parsed from Leader's description text), datasheets and images come from Dealer Shop. Images are hot-linked from `leadersystems.com.au/Images/`. Racks lead with the clean `_2` photo because Leader's main image is a labelled marketing tile.
- **Carbon (59 SKUs):** from `carbon sku list.txt`. Not in Dealer Shop yet, so there's no price, stock, photo or datasheet. Usable depth and load rating stay `null` until the datasheets arrive; they are never guessed.
- **Fit rules** (which shelves suit which cabinet depths, doors and plinths by footprint) are in `build-catalog.mjs` → `SHELF_DEPTH_FIT` and `carbon.json`. The Carbon shelf ranges mirror the equivalent LDR parts and need confirming.

## Rack Builder

Logic is in `src/lib/builder.ts` (pure functions). The UI is in `src/components/builder/RackBuilder.tsx`.

1. **Where:** wall / floor (optional soundproof) / compact 10" / open frame.
2. **What:** presets (Home/NBN, Small office, CCTV, AV, Server room) plus per-device quantities. Desktop boxes go on 2U shelf zones, two boxes per shelf.
3. **Preferences:** growth allowance, range, door, deepest-device override.

**Matching:** the builder picks the smallest cabinet that fits the equipment plus the growth allowance and the deepest device, preferring cabinets with confirmed specs. If nothing fits, it relaxes the constraints one at a time, in this order: door, then range, then growth, then closest match. Each relaxation is explained to the user, so the result is never a dead end.

**Output:** a recommended SKU, up to three alternatives (bigger, other range, deeper), pass/fail checks, an SVG front view, and a parts list. The parts list covers shelves, a PDU sized to outlet count (or noted as included), blanking panels for spare U, cage nuts, and optional fans, plinth and VCM. It also shows the RRP total, a quote hand-off, a shareable URL and print.

## What changed from the concept site

Removed: the 3D turntable, the decorative Australia map, unverified logistics claims ("30-minute pickup", "metro delivery from 2 hours", "Since 1996"), stat strips and repeated slogan headings. The builder now works from the customer's equipment rather than asking them to pick a cabinet first, and it covers both ranges.

## Before launch: VERIFY / TODO

- [ ] Warehouse addresses and phone numbers for every branch except Adelaide (`src/data/site.ts`)
- [ ] Quote form: replace the `mailto:` hand-off with a real endpoint (`src/pages/quote.astro`), and confirm `site.quoteEmail`
- [ ] Carbon photos, datasheets, usable depth, load ratings and RRP → `carbon.json`, then `npm run catalog`
- [ ] Carbon shelf depth-fit ranges (`SHELF_DEPTH_FIT`)
- [ ] Two outdoor cabinets from the concept (`RCLDR-WB-OD-A6822`, `RCLDR-OD800-34U-A`) aren't in Dealer Shop, so they're excluded
- [ ] Production domain (`astro.config.mjs` → `site`)
- [ ] Self-host product images rather than hot-linking Leader's
- [ ] Optional: live stock by state (the data is already in the sync; not displayed because a static build would go stale)

# LDR website

Catalogue and Rack Builder for LDR data racks (existing range + new Carbon range).

**Stack:** [Astro 5](https://astro.build) (static, multipage) with two React islands: the Rack Builder and the home page hero, which share one rack renderer. No CSS framework; tokens live in `src/styles/global.css`.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # rebuilds catalog.json, then the static site into dist/
npm run sync       # refresh existing-range data from Leader Dealer Shop (needs the `leader` CLI)
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Home: live rack hero (pick a setup, the matched cabinet resizes), shop by type, a worked Rack Builder example, Carbon line-up, where to buy |
| `/products` | Catalogue with filters (range, type, U, width, depth, door), search and sort. Filter state is kept in the URL. |
| `/products/[sku]` | Product page: key facts, specs, dimension drawing, datasheet, "fits this cabinet" / "fits these cabinets", Carbon↔LDR equivalent, other sizes |
| `/carbon` | Carbon range overview with a to-scale line-up |
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

## Design

Light, quiet and product-first (the brief was "clean, UniFi/Apple-like"): white and soft-grey tiles, near-black ink, one blue for actions, pill buttons, large radii, Inter with JetBrains Mono for SKUs only. Dark charcoal is reserved for the Carbon range. Sections ease in on scroll (`.reveal`), pages cross-fade and the product photo travels from a card to its product page (native view transitions, progressive enhancement). Everything honours `prefers-reduced-motion`.

Product photos are shot on white, so they are multiplied into the grey tiles (`mix-blend-mode: multiply`) rather than boxed.

**Drawings (`src/lib/art.ts`)** are generated from catalogue data, in millimetres:

- `faceplate()` / `faceThumb()`: front panels for each kind of equipment.
- `cabinetArt()` / `lineupArt()`: cabinet illustrations, used where there is no photo yet (all Carbon cabinets) and for the to-scale Carbon line-up. They are labelled "Illustration" on the page.
- `dimensionArt()`: front and side outline with dimension lines for product pages.
- `rackGeo()`: the geometry behind all of the above and the 3D scene.

Height is always true to the rack-unit count. Where a datasheet value is missing (Carbon heights and usable depths, mini racks, brackets) the drawing uses a typical shape for that cabinet type and the number is **not printed**: unknown specs are never shown as specs.

## Rack Builder

Logic is in `src/lib/builder.ts` (pure functions). The UI is `RackBuilder.tsx` (the workspace) and `RackScene.tsx` (the rack), both in `src/components/builder/`.

The page is a workspace in three parts:

1. **Equipment (left).** Where it's going (wall / floor with optional soundproof / compact 10" / open frame), typical setups, and a stepper per device. Desktop boxes go on 2U shelf zones, two boxes per shelf.
2. **The rack (centre).** The matched cabinet drawn to scale with the equipment in it. Three views: **Front** (rearrange), **Side** (see-through, shows usable depth against each device's depth) and **3D**. Drag the background to turn the cabinet; open or close the door. Equipment can be dragged to a new position, or moved with the arrow keys (Delete removes it). Selecting free space offers equipment to add.
3. **The build (right).** Matched cabinet, every cabinet height for that placement and each variant at the chosen height, space and depth meters, match settings (growth, range, door, deepest device), the parts list, RRP total, quote hand-off, shareable link and print.

Silver faceplates are the customer's own equipment; black ones are LDR parts on the parts list. Hovering a part highlights it in the rack and vice versa.

**Matching:** the builder picks the smallest cabinet that fits the equipment plus the growth allowance and the deepest device, preferring cabinets with confirmed specs. If nothing fits, it relaxes the constraints one at a time, in this order: door, then range, then growth, then closest match. Each relaxation is explained to the user, so the result is never a dead end. The customer can pick any other standard cabinet; if the equipment doesn't fit it, the rack shows what's left over.

**Layout:** the rack holds two stacks, one hanging from the top and one standing on the bottom, with spare space between. A layout is the top-to-bottom sequence of tokens (a device id, `shelf` or `pdu`) with a gap marker; `arrange()` turns it into positions and fills the gap with the blanking panels on the parts list. The default order is what an installer would do: patching and switching at the top, shelves in the middle, power and UPS at the bottom. A customer's own order is kept in the URL (`lay=patch.switch.shelf._.pdu`) so shared links restore it. Blanking panels are only suggested for enclosed cabinets.

**The 3D scene** is plain CSS 3D, not WebGL and not a model file: `RackScene.tsx` sets the cabinet's dimensions in millimetres as registered custom properties and `rack-scene.css` builds the panels, rails, door and equipment bodies from them, scaled to fit with container units. That is why cabinets morph smoothly from one size to the next and why there is nothing to load. Notes for anyone editing it:

- Inside a 3D context browsers hit-test by depth, so only the equipment (`.rs-front`, `.rs-free`) takes pointer events; everything else falls through to the scene root, which handles turning.
- Dragging to rearrange is mouse/pen only and only in the front view. On touch, tap an item and use the move buttons.

## What changed from the concept site

Removed: the decorative 3D turntable, the Australia map, unverified logistics claims ("30-minute pickup", "metro delivery from 2 hours", "Since 1996"), stat strips and repeated slogan headings. The builder now works from the customer's equipment rather than asking them to pick a cabinet first, and it covers both ranges.

The concept's fit-out view is back in a different form: instead of a rendered model that only spins, the cabinet is drawn from catalogue dimensions and filled with the customer's actual equipment, so the 3D and side views answer a real question (does it fit, and how deep does it sit). The concept's Carbon renders are not used as product photos.

## Before launch: VERIFY / TODO

- [ ] Warehouse addresses and phone numbers for every branch except Adelaide (`src/data/site.ts`)
- [ ] Quote form: replace the `mailto:` hand-off with a real endpoint (`src/pages/quote.astro`), and confirm `site.quoteEmail`
- [ ] Carbon photos, datasheets, usable depth, load ratings and RRP → `carbon.json`, then `npm run catalog`
- [ ] Carbon shelf depth-fit ranges (`SHELF_DEPTH_FIT`)
- [ ] Two outdoor cabinets from the concept (`RCLDR-WB-OD-A6822`, `RCLDR-OD800-34U-A`) aren't in Dealer Shop, so they're excluded
- [ ] Production domain (`astro.config.mjs` → `site`)
- [ ] Self-host product images rather than hot-linking Leader's
- [ ] Optional: live stock by state (the data is already in the sync; not displayed because a static build would go stale)
- [ ] `RCLDR-FS800-18U-A`: Leader's datasheet text gives an 800 mm mounting depth for an 800 mm deep cabinet and an 820 mm outer height for 18U. Both look wrong and both are now visible in the builder's side view and the product drawing, so confirm them with Leader
- [ ] Try the Rack Builder on real phones and tablets (checked at a 390 px viewport in desktop Chrome only) and in Safari/Firefox (the 3D scene relies on `@property` and container units)
- [ ] Fonts load from Google Fonts; self-host if that's a concern

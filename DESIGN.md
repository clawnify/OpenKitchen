# OpenKitchen — design

This file is the **app-specific** design brief: scope, information architecture,
and the screens. It does **not** restate visual tokens — colors, type, spacing,
the five "Clawnify signature" moves, and dual human/agent mode all come from the
Clawnify Apps design system, which every build inherits. Follow that for anything
visual; follow this for *what goes where*.

## Scope (the deliberate boundary)

OpenKitchen owns exactly one thing nothing else on the platform models: the
**kitchen cost graph** — `ingredient ↔ supplier price ↔ recipe/prep ↔ food cost
↔ inventory ↔ production ↔ supplier invoice` — plus a **documents** lifecycle for
licenses/permits/HACCP.

It **borrows** the AI-native pieces instead of rebuilding them:

- **Invoice OCR** → the multimodal agent reads the photo and POSTs lines. No OCR
  service in this app.
- **Forecasting / P&L narrative / variance analysis** → the agent over the JSON
  API (`OPENROUTER_API_KEY` for prose; deterministic heuristics otherwise — same
  pattern as `open-ads-report`).
- **Statutory books, VAT, e-invoicing** → `open-books`. OpenKitchen surfaces food
  cost and margin; it does not grow a second ledger.

The app therefore does the **deterministic math** (cost roll-up, food-cost %,
variance, reorder points, cost drift) and exposes it; the agent does the judgement.
This split — record vs action — is the product story: *your kitchen's back office,
run by an employee you text*, not another dashboard you log into.

## Stack

React 19 + Hono + `@clawnify/db` on Cloudflare Workers + D1, Tailwind v4, driven by
the `clawnify` CLI — matching `open-books`. Server: `src/server/{index.ts, db.ts,
routes.ts, domain/*}`, schema in `src/server/schema.sql`. Uploads (invoice & document
scans) go to R2 via `src/server/uploads.ts` (`storage: true`). UUID string PKs,
generated server-side with `crypto.randomUUID()`; money in integer cents.

## Navigation (260px sidebar)

Grouped, each group titled with a muted eyebrow:

- **Overview** — Dashboard
- **Menu** — Recipes, Ingredients, Suppliers
- **Operations** — Inventory, Production, Invoices
- **Compliance** — Documents

The one coral primary action is per-screen and contextual (New recipe / New
ingredient / Log count / New invoice / New document).

## Screens

Every screen is zoned cards opened by eyebrows; numbers are tabular with footer
aggregates; enumerable values (category, unit, allergen, status) are chips, and
attention states (over-target, expiring, unreconciled) are tinted badges.

- **Dashboard** — a KPI row (`GET /api/state`): weighted **food-cost %**, **stock
  value**, **open invoices**, **expiring documents**. Then zones: *Dishes over
  target* (worst food-cost % first), *Cost drift* (ingredients whose price moved
  most, from `supplier_price_history`), *Reorder now* (at/under par), *Expiring
  soon* (documents). Empty state is borderless with the one next action.
- **Recipes** — list with rolled-up **cost / yield unit**, price, margin, food-cost %
  badge (green under target, amber/red over). Detail page: a *Yield* zone, a
  *Bill of materials* zone (ingredients + nested preps, each line showing qty·unit
  and its cost contribution, footer = total plate cost), and a *Cost history* zone.
  A `prep` looks identical but has no menu price.
- **Ingredients** — table: name, category chip, base unit, **current cost/unit**,
  supplier, par level, allergen chips. Row → cost-history sparkline. Cost is
  read-mostly here; it changes via invoice reconciliation, not hand-editing.
- **Suppliers** — directory; detail shows that supplier's ingredients and recent
  invoices.
- **Inventory** — per ingredient: latest count, theoretical on-hand, par, and a
  *below-par* badge. Primary action **Log count** (a `Dialog`, not a prompt).
- **Production** — log of runs (recipe · qty · date · source chip). This is what
  drives theoretical usage; central kitchens (e.g. eatdis) live here, POS imports
  land here too.
- **Invoices** — list with supplier, number, date, total, and a status badge
  (`pending` / `reconciled` / `paid`); a source chip marks `agent-ocr`. Detail shows
  scanned image alongside editable lines, each matchable to an ingredient; the coral
  action is **Reconcile** (updates costs + price history). Most invoices arrive
  already drafted by the agent — this screen is the human's review surface.
- **Documents** — licenses/permits/leases/HACCP with issuer, reference, expiry, and
  a lifecycle badge (`valid` / `expiring` / `expired`). The agent nudges; this is
  where a human files the renewal.

## Dual mode (inherited, non-negotiable)

Per the platform system: detect `?agent`/`mode=agent`, set `data-agent`, bump targets
to 40–44px, every action a real `<button aria-label>`, semantic tables, no
`alert/confirm/prompt/localStorage`. Both the human (dashboard iframe) and the agent
(computer-use browser) drive these same screens.

## Preview mode

With an empty database the app seeds **sample data** (a small menu, a few suppliers,
one expiring HACCP certificate) so the dashboard looks alive inside the Clawnify
iframe before the owner has entered anything — same convention as the other templates.

<!-- Banner: run the `readme-banner` skill once there's a deployed screenshot, then drop the image here (above the H1). -->

# Open Kitchen

Open-source **restaurant & central-kitchen back-of-house software** — a free,
self-hostable alternative to Apicbase, MarketMan, Craftable, MarginEdge, Restaurant365,
xtraCHEF, WISK, meez, Nory, Fullsoon and Supy. It owns your kitchen's cost graph —
ingredients, supplier prices, recipes and sub-recipe preps, food cost, inventory,
production and supplier invoices — and tracks licenses, permits, leases and HACCP
certificates with expiry reminders.

**Restaurant inventory management, recipe costing, food-cost control and invoice
processing** for independent restaurants, multi-site groups, central/commissary
kitchens, catering companies, bakeries and cloud kitchens — without the per-seat SaaS bill.

Built on the [Clawnify](https://clawnify.com) template format. React + Hono + D1 on
Cloudflare Workers. Deploy your own copy in minutes, customize freely, own the data.

## The idea: record vs action

Most tools in this space bolt a chatbot onto a dashboard. Open Kitchen inverts it.
**The app is the system of record; your Clawnify agent is the system of action** —
reachable on WhatsApp and email:

- **You** send a photo of a supplier invoice → the agent reads it, logs the lines, and
  reconciles the new costs into your ingredients and price history.
- The app recomputes **food cost** for every affected dish and flags any that crossed
  its target margin.
- The agent forecasts next week's volume, drafts **reorder** lists, and chases your
  **license / HACCP renewals** before they lapse.

The app does the deterministic math (cost roll-up, variance, reorder points, cost
drift) and exposes it as a clean JSON API; the agent does the judgement. See
[`agent.md`](./agent.md) for the full contract and playbook.

## What it does

- **Recipes & preps** — recursive bill of materials (dishes built from ingredients and
  nested sub-recipes), rolled-up cost per portion, margin and food-cost % against target.
- **Ingredients & suppliers** — cost per unit kept fresh from reconciled invoices, with
  full supplier price history and allergen tracking.
- **Invoices** — supplier invoices with line items; one click (or the agent) reconciles
  costs and appends price history. Cost drift surfaces on the dashboard.
- **Inventory & production** — stock counts vs par, production runs that drive
  theoretical usage, and a variance view. Reorder suggestions for anything below par.
- **Documents** — licenses, permits, leases and HACCP certificates with a
  valid → expiring → expired lifecycle the agent watches.

Out of scope by design: statutory double-entry books, VAT and e-invoicing — that's
[`open-books`](https://github.com/clawnify/open-books), which Open Kitchen sits neatly
beside.

## Develop

```bash
pnpm install
pnpm dev          # local dev at http://localhost:5173
```

With an empty database the app seeds a small central-kitchen sample so the dashboard
looks alive before you've entered anything.

## Deploy

```bash
pnpm deploy       # deploy to Clawnify
```

## Open-source alternative to popular restaurant back-of-house software

Open Kitchen is a free, self-hostable alternative to the leading restaurant
back-of-house and inventory platforms. If you're comparing tools, it covers the same
core jobs — recipe costing, food-cost tracking, inventory counts, supplier invoices and
purchasing — with an AI agent doing the day-to-day work over chat:

- **Back-office & food-cost suites** — Apicbase, MarketMan, Craftable, MarginEdge,
  Restaurant365, xtraCHEF by Toast, Marketman, Optimum Control.
- **Inventory & stock counting** — WISK, Supy, Sculpture Hospitality, Yellow Dog.
- **Recipe & menu costing** — meez, Melba, ReciPal, FoodMeUp.
- **AI forecasting & ordering** — Nory, Fullsoon, Praedixa, Lineup.ai.

Unlike per-seat SaaS, you deploy your own copy, own your data, and pay no monthly
per-location fee.

**Keywords:** restaurant inventory management software, recipe costing software, food
cost software, restaurant back-office software, central kitchen software, commissary
kitchen management, catering software, HACCP tracking, supplier invoice management,
open-source restaurant software.

## License

AGPL-3.0.

-- open-kitchen — the restaurant / central-kitchen back-of-house cost graph.
--
-- Scope (see DESIGN.md): this app OWNS the one domain object nothing else on
-- the platform models — the recipe <-> ingredient <-> cost <-> inventory <->
-- supplier-invoice graph — plus a lifecycle table for licenses/permits/HACCP.
-- It deliberately does NOT own: invoice OCR (the multimodal agent does that and
-- POSTs lines), sales forecasting / P&L narrative (the agent over the JSON API),
-- or statutory double-entry books & VAT (that is `open-books`).
--
-- Conventions: one D1 database per deployed app, so per-org isolation is handled
-- by the platform (no org_id column). Money is integer cents. Timestamps are
-- TEXT via datetime('now'). Primary keys are UUID TEXT, generated app-side with
-- crypto.randomUUID() on insert (never expose enumerable integer ids — an app
-- row is reachable from the dashboard iframe and the agent API). SQLite has no
-- native uuid(), so PKs have no DEFAULT — the server sets them.

-- ─── Suppliers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ─── Ingredients ─────────────────────────────────────────────────────────────
-- `unit` is the base costing/counting unit (e.g. 'g', 'ml', 'unit'). `cost_cents`
-- is the current cost of ONE base unit, kept fresh from the most recent reconciled
-- invoice line (see supplier_price_history). Purchase packs (a 25 kg flour sack)
-- are recorded on invoice_lines; the agent/manual entry converts pack qty -> base
-- units. Cross-unit conversion is intentionally NOT modelled in the schema
-- (documented ceiling): one base unit per ingredient keeps the food-cost math
-- exact. If multi-unit purchasing becomes load-bearing, add a units/conversion
-- table then — do not fake it with a second cost column.
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,                              -- produce, dairy, meat, dry, ...
  unit TEXT NOT NULL DEFAULT 'unit',          -- base costing/counting unit
  cost_cents INTEGER NOT NULL DEFAULT 0,      -- current cost per base unit
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  par_level REAL,                             -- reorder threshold, base units
  allergens TEXT,                            -- comma-separated; agent-enriched
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON ingredients(supplier_id);

-- ─── Recipes (dishes & sub-recipe preps) ────────────────────────────────────
-- A recipe yields `yield_qty` of `yield_unit` (e.g. 10 'portion', 2 'litre').
-- Food cost per yield unit = SUM(recipe_items cost) / yield_qty. A `prep` is a
-- sub-recipe (a sauce, a stock, a dough) that other recipes consume as a line.
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'dish' CHECK (kind IN ('dish','prep')),
  category TEXT,                              -- starter, main, sauce, ...
  yield_qty REAL NOT NULL DEFAULT 1,
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  menu_price_cents INTEGER,                   -- selling price per yield unit (dishes)
  target_food_cost_pct REAL,                  -- e.g. 30.0 — flags dishes over target
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_kind ON recipes(kind);

-- ─── Recipe items (bill of materials, recursive) ────────────────────────────
-- Each line is either a raw ingredient OR another recipe (a prep), so cost rolls
-- up through nested preps. Exactly one of ingredient_id / sub_recipe_id is set
-- (enforced by CHECK). Guard against a recipe referencing itself as a prep; deeper
-- cycles are prevented in the cost walker (see domain/food-cost.ts), not here.
CREATE TABLE IF NOT EXISTS recipe_items (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('ingredient','recipe')),
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE RESTRICT,
  sub_recipe_id TEXT REFERENCES recipes(id) ON DELETE RESTRICT,
  qty REAL NOT NULL DEFAULT 0,                -- in the child's base / yield unit
  unit TEXT,                                  -- denormalised for display
  CHECK (
    (item_type = 'ingredient' AND ingredient_id IS NOT NULL AND sub_recipe_id IS NULL) OR
    (item_type = 'recipe'     AND sub_recipe_id IS NOT NULL AND ingredient_id IS NULL)
  ),
  CHECK (sub_recipe_id IS NULL OR sub_recipe_id <> recipe_id)
);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient ON recipe_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_sub ON recipe_items(sub_recipe_id);

-- ─── Supplier invoices (cost events; OCR'd by the agent) ────────────────────
-- The agent reads an invoice photo/PDF (multimodal) and POSTs a row + lines with
-- source='agent-ocr' and the R2 file_path. Reconciling the invoice writes each
-- matched line's unit cost into ingredients.cost_cents and appends a
-- supplier_price_history row.
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT,
  invoice_date TEXT,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reconciled','paid')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','agent-ocr')),
  file_path TEXT,                             -- R2 key of the uploaded photo / PDF
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,  -- NULL until matched
  description TEXT NOT NULL,                  -- raw text from the invoice line
  qty REAL NOT NULL DEFAULT 0,               -- in ingredient base units once matched
  unit TEXT,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_ingredient ON invoice_lines(ingredient_id);

-- ─── Supplier price history (cost-drift alerts + accurate food cost) ────────
-- Append-only: one row per observed unit cost, written when an invoice line is
-- reconciled. Lets the app show "flour +18% since March" and keeps historical
-- food-cost honest instead of silently overwriting.
CREATE TABLE IF NOT EXISTS supplier_price_history (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_cost_cents INTEGER NOT NULL,
  effective_date TEXT NOT NULL DEFAULT (datetime('now')),
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_price_history_ingredient ON supplier_price_history(ingredient_id, effective_date);

-- ─── Inventory counts (stock takes) ─────────────────────────────────────────
-- Each row is a physical count of one ingredient at a point in time. Actual
-- on-hand = latest count; variance = theoretical (from production_runs) vs count.
CREATE TABLE IF NOT EXISTS inventory_counts (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  counted_qty REAL NOT NULL DEFAULT 0,       -- base units
  count_date TEXT NOT NULL DEFAULT (datetime('now')),
  counted_by TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_ingredient ON inventory_counts(ingredient_id, count_date);

-- ─── Production runs (what was made / sold — drives theoretical usage) ──────
-- Works for a central kitchen ("produced 120 portions of X on D", eatdis-style)
-- and for a dine-in POS import ("sold 40 of dish Y"). Theoretical ingredient
-- usage over a window = SUM over runs of (recipe BOM x qty); the variance report
-- compares that against inventory_counts.
CREATE TABLE IF NOT EXISTS production_runs (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  qty REAL NOT NULL DEFAULT 0,               -- number of yield units produced / sold
  run_date TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','agent','pos')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_production_runs_recipe ON production_runs(recipe_id, run_date);
CREATE INDEX IF NOT EXISTS idx_production_runs_date ON production_runs(run_date);

-- ─── POS item map (a POS menu item → a recipe) ──────────────────────────────
-- The seam for POS sales sync. A POS integration (Lightspeed / unTill /
-- MplusKASSA for the Dutch market, or Deliverect as an aggregator) pulls
-- per-item sales; each POS product id maps to a recipe here, and the import
-- turns "sold N of item X" into a production_run (source='pos'), which drives
-- theoretical usage and variance — no rework, the same model manual runs use.
-- The pull itself is the agent's job (POS credential → POST the import); this
-- table + the import endpoint are just the target it writes to.
CREATE TABLE IF NOT EXISTS pos_item_map (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,                     -- lightspeed | untill | mpluskassa | deliverect | ...
  pos_item_id TEXT NOT NULL,                  -- the POS product id
  pos_item_name TEXT,                         -- POS product name (for reference / agent matching)
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, pos_item_id)
);
CREATE INDEX IF NOT EXISTS idx_pos_item_map_lookup ON pos_item_map(provider, pos_item_id);
CREATE INDEX IF NOT EXISTS idx_pos_item_map_recipe ON pos_item_map(recipe_id);

-- ─── Documents (licenses, permits, leases, HACCP certs — a lifecycle) ──────
-- First-class table because the renewal reminder IS a lifecycle, not a cron job:
-- valid -> expiring -> expired, plus reminded_at so the agent nudges once, not
-- daily. The agent reads status='expiring'/'expired' rows and pings the owner on
-- WhatsApp. HACCP certificates matter for audited kitchens (e.g. eatdis).
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'license'
    CHECK (kind IN ('license','permit','lease','certificate','haccp','insurance','other')),
  name TEXT NOT NULL,
  issuer TEXT,
  reference TEXT,
  issued_date TEXT,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring','expired')),
  file_path TEXT,                            -- R2 key of the scanned document
  reminded_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

import { Hono } from "hono";
import { get, query } from "./db";
import { insert, update, remove, byId } from "./domain/store";
import { allRecipeCosts, recipeCost } from "./domain/food-cost";
import { inventory, reorder, variance } from "./domain/usage";
import { dashboardState } from "./domain/state";
import { getUpload } from "./uploads";

const api = new Hono();

// ─── Dashboard ──────────────────────────────────────────────────────────────
api.get("/api/state", async (c) => c.json(await dashboardState()));

// ─── Suppliers ───────────────────────────────────────────────────────────────
api.get("/api/suppliers", async (c) =>
  c.json(await query("SELECT * FROM suppliers ORDER BY name")),
);
api.post("/api/suppliers", async (c) => {
  const b = await c.req.json();
  if (!b?.name?.trim()) return c.json({ error: "Name required" }, 400);
  const id = await insert("suppliers", {
    name: b.name.trim(),
    contact_name: b.contact_name,
    email: b.email,
    phone: b.phone,
    notes: b.notes,
  });
  return c.json(await byId("suppliers", id), 201);
});
api.patch("/api/suppliers/:id", async (c) => {
  await update("suppliers", c.req.param("id"), await c.req.json());
  return c.json(await byId("suppliers", c.req.param("id")));
});
api.delete("/api/suppliers/:id", async (c) => {
  await remove("suppliers", c.req.param("id"));
  return c.json({ ok: true });
});

// ─── Ingredients ─────────────────────────────────────────────────────────────
api.get("/api/ingredients", async (c) => {
  const q = c.req.query("q");
  const sql = q
    ? "SELECT * FROM ingredients WHERE active = 1 AND name LIKE ? ORDER BY name"
    : "SELECT * FROM ingredients WHERE active = 1 ORDER BY name";
  return c.json(await query(sql, q ? [`%${q}%`] : []));
});
api.post("/api/ingredients", async (c) => {
  const b = await c.req.json();
  if (!b?.name?.trim()) return c.json({ error: "Name required" }, 400);
  const id = await insert("ingredients", {
    name: b.name.trim(),
    category: b.category,
    unit: b.unit ?? "unit",
    cost_cents: b.cost_cents ?? 0,
    supplier_id: b.supplier_id,
    par_level: b.par_level,
    allergens: b.allergens,
  });
  return c.json(await byId("ingredients", id), 201);
});
api.patch("/api/ingredients/:id", async (c) => {
  await update("ingredients", c.req.param("id"), await c.req.json());
  return c.json(await byId("ingredients", c.req.param("id")));
});
api.delete("/api/ingredients/:id", async (c) => {
  await remove("ingredients", c.req.param("id"));
  return c.json({ ok: true });
});

// ─── Recipes & food cost ────────────────────────────────────────────────────
api.get("/api/recipes", async (c) => {
  const kind = c.req.query("kind") as "dish" | "prep" | undefined;
  return c.json(await allRecipeCosts(kind));
});
api.get("/api/food-cost", async (c) => c.json(await allRecipeCosts("dish")));
api.get("/api/recipes/:id", async (c) => {
  const id = c.req.param("id");
  const recipe = await byId("recipes", id);
  if (!recipe) return c.json({ error: "Not found" }, 404);
  const items = await query(
    `SELECT ri.*, i.name AS ingredient_name, i.cost_cents AS ingredient_cost_cents,
            i.unit AS ingredient_unit, r.name AS sub_recipe_name
       FROM recipe_items ri
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
       LEFT JOIN recipes r ON r.id = ri.sub_recipe_id
      WHERE ri.recipe_id = ?`,
    [id],
  );
  return c.json({ recipe, items, cost: await recipeCost(id) });
});
api.post("/api/recipes", async (c) => {
  const b = await c.req.json();
  if (!b?.name?.trim()) return c.json({ error: "Name required" }, 400);
  const id = await insert("recipes", {
    name: b.name.trim(),
    kind: b.kind ?? "dish",
    category: b.category,
    yield_qty: b.yield_qty ?? 1,
    yield_unit: b.yield_unit ?? "portion",
    menu_price_cents: b.menu_price_cents,
    target_food_cost_pct: b.target_food_cost_pct,
    notes: b.notes,
  });
  return c.json(await byId("recipes", id), 201);
});
api.patch("/api/recipes/:id", async (c) => {
  await update("recipes", c.req.param("id"), await c.req.json());
  return c.json(await byId("recipes", c.req.param("id")));
});
api.delete("/api/recipes/:id", async (c) => {
  await remove("recipes", c.req.param("id"));
  return c.json({ ok: true });
});
api.post("/api/recipes/:id/items", async (c) => {
  const b = await c.req.json();
  const id = await insert("recipe_items", {
    recipe_id: c.req.param("id"),
    item_type: b.item_type,
    ingredient_id: b.item_type === "ingredient" ? b.ingredient_id : undefined,
    sub_recipe_id: b.item_type === "recipe" ? b.sub_recipe_id : undefined,
    qty: b.qty ?? 0,
    unit: b.unit,
  });
  return c.json(await byId("recipe_items", id), 201);
});
api.delete("/api/recipe-items/:id", async (c) => {
  await remove("recipe_items", c.req.param("id"));
  return c.json({ ok: true });
});

// ─── Invoices ────────────────────────────────────────────────────────────────
api.get("/api/invoices", async (c) =>
  c.json(
    await query(
      `SELECT inv.*, s.name AS supplier_name
         FROM invoices inv LEFT JOIN suppliers s ON s.id = inv.supplier_id
        ORDER BY inv.invoice_date DESC, inv.created_at DESC`,
    ),
  ),
);
api.get("/api/invoices/:id", async (c) => {
  const invoice = await byId("invoices", c.req.param("id"));
  if (!invoice) return c.json({ error: "Not found" }, 404);
  const lines = await query(
    `SELECT il.*, i.name AS ingredient_name
       FROM invoice_lines il LEFT JOIN ingredients i ON i.id = il.ingredient_id
      WHERE il.invoice_id = ?`,
    [c.req.param("id")],
  );
  return c.json({ invoice, lines });
});
api.post("/api/invoices", async (c) => {
  const b = await c.req.json();
  const id = await insert("invoices", {
    supplier_id: b.supplier_id,
    invoice_number: b.invoice_number,
    invoice_date: b.invoice_date,
    total_cents: b.total_cents ?? 0,
    currency: b.currency ?? "EUR",
    status: b.status ?? "pending",
    source: b.source ?? "manual",
    file_path: b.file_path,
    notes: b.notes,
  });
  for (const line of b.lines ?? []) {
    await insert("invoice_lines", {
      invoice_id: id,
      ingredient_id: line.ingredient_id,
      description: line.description ?? "",
      qty: line.qty ?? 0,
      unit: line.unit,
      unit_cost_cents: line.unit_cost_cents ?? 0,
      line_total_cents: line.line_total_cents ?? 0,
    });
  }
  return c.json(await byId("invoices", id), 201);
});
// Match lines → ingredients, push new unit costs, append price history.
api.post("/api/invoices/:id/reconcile", async (c) => {
  const id = c.req.param("id");
  const invoice = await byId<{ supplier_id: string | null }>("invoices", id);
  if (!invoice) return c.json({ error: "Not found" }, 404);
  const lines = await query<{
    ingredient_id: string | null;
    unit_cost_cents: number;
  }>("SELECT ingredient_id, unit_cost_cents FROM invoice_lines WHERE invoice_id = ?", [id]);
  let updated = 0;
  for (const line of lines) {
    if (!line.ingredient_id || line.unit_cost_cents <= 0) continue;
    await update("ingredients", line.ingredient_id, {
      cost_cents: line.unit_cost_cents,
    });
    await insert("supplier_price_history", {
      ingredient_id: line.ingredient_id,
      supplier_id: invoice.supplier_id,
      unit_cost_cents: line.unit_cost_cents,
      invoice_id: id,
    });
    updated++;
  }
  await update("invoices", id, { status: "reconciled" });
  return c.json({ ok: true, ingredients_updated: updated });
});
api.patch("/api/invoices/:id", async (c) => {
  await update("invoices", c.req.param("id"), await c.req.json());
  return c.json(await byId("invoices", c.req.param("id")));
});

// ─── Inventory / production / variance / reorder ────────────────────────────
api.get("/api/inventory", async (c) => c.json(await inventory()));
api.post("/api/inventory/counts", async (c) => {
  const b = await c.req.json();
  if (!b?.ingredient_id) return c.json({ error: "ingredient_id required" }, 400);
  const id = await insert("inventory_counts", {
    ingredient_id: b.ingredient_id,
    counted_qty: b.counted_qty ?? 0,
    count_date: b.count_date,
    counted_by: b.counted_by,
    note: b.note,
  });
  return c.json(await byId("inventory_counts", id), 201);
});
api.get("/api/reorder", async (c) => c.json(await reorder()));
api.get("/api/variance", async (c) =>
  c.json(await variance(c.req.query("since"), c.req.query("until"))),
);
api.get("/api/production-runs", async (c) =>
  c.json(
    await query(
      `SELECT pr.*, r.name AS recipe_name, r.yield_unit
         FROM production_runs pr JOIN recipes r ON r.id = pr.recipe_id
        ORDER BY pr.run_date DESC, pr.created_at DESC`,
    ),
  ),
);
api.post("/api/production-runs", async (c) => {
  const b = await c.req.json();
  if (!b?.recipe_id) return c.json({ error: "recipe_id required" }, 400);
  const id = await insert("production_runs", {
    recipe_id: b.recipe_id,
    qty: b.qty ?? 0,
    run_date: b.run_date,
    source: b.source ?? "manual",
    note: b.note,
  });
  return c.json(await byId("production_runs", id), 201);
});

// ─── Documents ───────────────────────────────────────────────────────────────
api.get("/api/documents", async (c) => {
  const status = c.req.query("status");
  const sql = status
    ? "SELECT * FROM documents WHERE status = ? ORDER BY expiry_date"
    : "SELECT * FROM documents ORDER BY expiry_date";
  return c.json(await query(sql, status ? [status] : []));
});
api.post("/api/documents", async (c) => {
  const b = await c.req.json();
  if (!b?.name?.trim()) return c.json({ error: "Name required" }, 400);
  const id = await insert("documents", {
    kind: b.kind ?? "license",
    name: b.name.trim(),
    issuer: b.issuer,
    reference: b.reference,
    issued_date: b.issued_date,
    expiry_date: b.expiry_date,
    status: b.status ?? "valid",
    file_path: b.file_path,
    notes: b.notes,
  });
  return c.json(await byId("documents", id), 201);
});
api.patch("/api/documents/:id", async (c) => {
  await update("documents", c.req.param("id"), await c.req.json());
  return c.json(await byId("documents", c.req.param("id")));
});

// ─── Uploads (invoice / document scans) ─────────────────────────────────────
api.get("/api/uploads/:filename", async (c) => {
  const file = await getUpload(c.req.param("filename"));
  if (!file) return c.json({ error: "Not found" }, 404);
  return new Response(file.data, {
    headers: { "Content-Type": file.contentType },
  });
});

export default api;

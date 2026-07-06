import { get, query } from "../db";
import { allRecipeCosts } from "./food-cost";
import { inventory, reorder } from "./usage";

// Dashboard summary — the deterministic numbers the app owns. The agent layers
// forecast / P&L narrative on top of this over the JSON API.

export interface CostDrift {
  ingredient_id: string;
  name: string;
  unit: string;
  previous_cents: number;
  current_cents: number;
  pct_change: number;
}

async function costDrift(limit = 5): Promise<CostDrift[]> {
  const ings = await query<{ id: string; name: string; unit: string }>(
    "SELECT id, name, unit FROM ingredients WHERE active = 1",
  );
  const out: CostDrift[] = [];
  for (const ing of ings) {
    const hist = await query<{ unit_cost_cents: number }>(
      "SELECT unit_cost_cents FROM supplier_price_history WHERE ingredient_id = ? ORDER BY effective_date DESC LIMIT 2",
      [ing.id],
    );
    if (hist.length < 2 || hist[1].unit_cost_cents === 0) continue;
    const current = hist[0].unit_cost_cents;
    const previous = hist[1].unit_cost_cents;
    out.push({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      previous_cents: previous,
      current_cents: current,
      pct_change: Math.round(((current - previous) / previous) * 1000) / 10,
    });
  }
  out.sort((a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change));
  return out.slice(0, limit);
}

export async function dashboardState() {
  const dishes = (await allRecipeCosts("dish")).filter((d) => d.menu_price_cents);
  const priced = dishes.filter((d) => d.food_cost_pct != null);
  const avgFoodCostPct = priced.length
    ? Math.round(
        (priced.reduce((s, d) => s + (d.food_cost_pct ?? 0), 0) / priced.length) * 10,
      ) / 10
    : null;

  const inv = await inventory();
  const stockValueCents = inv.reduce(
    (s, r) => s + (r.on_hand ?? 0) * r.cost_cents,
    0,
  );

  const openInvoices = await get<{ n: number; total: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS total FROM invoices WHERE status != 'paid'",
  );
  const expiringDocs = await query(
    "SELECT * FROM documents WHERE status IN ('expiring','expired') ORDER BY expiry_date",
  );
  const reorderRows = await reorder();

  return {
    food_cost_pct: avgFoodCostPct,
    dishes_over_target: dishes.filter((d) => d.over_target),
    stock_value_cents: Math.round(stockValueCents),
    open_invoices_count: openInvoices?.n ?? 0,
    open_invoices_total_cents: openInvoices?.total ?? 0,
    expiring_documents: expiringDocs,
    reorder: reorderRows,
    cost_drift: await costDrift(),
  };
}

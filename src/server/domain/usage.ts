import { get, query } from "../db";

// Inventory, theoretical usage and reorder math.
//
// A recipe's ingredient list is the quantity for one FULL batch (which yields
// `yield_qty` units). Producing `producedUnits` yield-units therefore consumes
// `item.qty × producedUnits / yield_qty` of each ingredient, recursing through
// prep sub-recipes. "Theoretical usage" = what production SHOULD have consumed;
// paired with the latest physical count it's the honest core of a variance view.
// (Full purchase-adjusted variance — opening + buys − closing — is a documented
// next step; see DESIGN.md.)

interface ItemRow {
  item_type: string;
  ingredient_id: string | null;
  sub_recipe_id: string | null;
  qty: number;
}

async function expand(
  recipeId: string,
  producedUnits: number,
  stack: Set<string>,
  acc: Map<string, number>,
): Promise<void> {
  if (stack.has(recipeId)) return; // cycle guard
  stack.add(recipeId);
  const r = await get<{ yield_qty: number }>(
    "SELECT yield_qty FROM recipes WHERE id = ?",
    [recipeId],
  );
  const yieldQty = r?.yield_qty && r.yield_qty > 0 ? r.yield_qty : 1;
  const fraction = producedUnits / yieldQty;
  const items = await query<ItemRow>(
    "SELECT item_type, ingredient_id, sub_recipe_id, qty FROM recipe_items WHERE recipe_id = ?",
    [recipeId],
  );
  for (const it of items) {
    const amount = it.qty * fraction;
    if (it.item_type === "ingredient" && it.ingredient_id) {
      acc.set(it.ingredient_id, (acc.get(it.ingredient_id) ?? 0) + amount);
    } else if (it.sub_recipe_id) {
      await expand(it.sub_recipe_id, amount, stack, acc);
    }
  }
  stack.delete(recipeId);
}

export async function theoreticalUsage(
  since?: string,
  until?: string,
): Promise<Map<string, number>> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (since) {
    where.push("run_date >= ?");
    params.push(since);
  }
  if (until) {
    where.push("run_date <= ?");
    params.push(until);
  }
  const runs = await query<{ recipe_id: string; qty: number }>(
    `SELECT recipe_id, qty FROM production_runs ${where.length ? "WHERE " + where.join(" AND ") : ""}`,
    params,
  );
  const acc = new Map<string, number>();
  for (const run of runs) await expand(run.recipe_id, run.qty, new Set(), acc);
  return acc;
}

export interface InventoryRow {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  cost_cents: number;
  par_level: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  on_hand: number | null; // latest count
  counted_at: string | null;
  below_par: boolean;
}

async function inventoryRows(): Promise<InventoryRow[]> {
  return query<InventoryRow>(
    `SELECT i.id, i.name, i.category, i.unit, i.cost_cents, i.par_level, i.supplier_id,
            s.name AS supplier_name,
            c.counted_qty AS on_hand, c.count_date AS counted_at,
            CASE WHEN i.par_level IS NOT NULL AND c.counted_qty IS NOT NULL
                 AND c.counted_qty <= i.par_level THEN 1 ELSE 0 END AS below_par
       FROM ingredients i
       LEFT JOIN suppliers s ON s.id = i.supplier_id
       LEFT JOIN (
         SELECT ic.ingredient_id, ic.counted_qty, ic.count_date
           FROM inventory_counts ic
           JOIN (
             SELECT ingredient_id, MAX(count_date) AS mx
               FROM inventory_counts GROUP BY ingredient_id
           ) last ON last.ingredient_id = ic.ingredient_id AND last.mx = ic.count_date
       ) c ON c.ingredient_id = i.id
      WHERE i.active = 1
      ORDER BY below_par DESC, i.name`,
  );
}

export async function inventory(): Promise<InventoryRow[]> {
  return inventoryRows();
}

export async function reorder(): Promise<
  (InventoryRow & { suggested_order_qty: number })[]
> {
  const rows = await inventoryRows();
  return rows
    .filter((r) => r.below_par)
    .map((r) => ({
      ...r,
      suggested_order_qty: Math.max(0, (r.par_level ?? 0) - (r.on_hand ?? 0)),
    }));
}

export interface VarianceRow extends InventoryRow {
  theoretical_used: number;
}

export async function variance(
  since?: string,
  until?: string,
): Promise<VarianceRow[]> {
  const usage = await theoreticalUsage(since, until);
  const rows = await inventoryRows();
  return rows
    .map((r) => ({ ...r, theoretical_used: Math.round((usage.get(r.id) ?? 0) * 100) / 100 }))
    .sort((a, b) => b.theoretical_used - a.theoretical_used);
}

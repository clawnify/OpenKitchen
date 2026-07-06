import { get, query } from "../db";

// Recipe food-cost roll-up. Walks the recursive bill of materials
// (recipe_items → ingredients and nested prep sub-recipes), guarding against
// cycles with a visited-set. All math is in cents; qty is REAL so intermediate
// products are fractional cents, rounded only at the leaf result.

export interface RecipeCost {
  recipe_id: string;
  name: string;
  kind: string;
  category: string | null;
  yield_qty: number;
  yield_unit: string;
  menu_price_cents: number | null;
  target_food_cost_pct: number | null;
  total_cost_cents: number; // to produce the full yield
  cost_per_unit_cents: number; // total / yield_qty
  food_cost_pct: number | null; // cost_per_unit / menu_price × 100
  margin_cents: number | null; // menu_price − cost_per_unit
  over_target: boolean;
}

interface RecipeRow {
  id: string;
  name: string;
  kind: string;
  category: string | null;
  yield_qty: number;
  yield_unit: string;
  menu_price_cents: number | null;
  target_food_cost_pct: number | null;
}

interface ItemRow {
  item_type: string;
  sub_recipe_id: string | null;
  qty: number;
  ingredient_cost_cents: number | null;
}

// Cost to produce ONE full yield of a recipe, walking nested preps.
async function yieldCost(recipeId: string, stack: Set<string>): Promise<number> {
  if (stack.has(recipeId)) return 0; // cycle guard
  stack.add(recipeId);
  const items = await query<ItemRow>(
    `SELECT ri.item_type, ri.sub_recipe_id, ri.qty,
            i.cost_cents AS ingredient_cost_cents
       FROM recipe_items ri
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?`,
    [recipeId],
  );
  let total = 0;
  for (const it of items) {
    if (it.item_type === "ingredient") {
      total += (it.ingredient_cost_cents ?? 0) * it.qty;
    } else if (it.sub_recipe_id) {
      const sub = await get<RecipeRow>("SELECT * FROM recipes WHERE id = ?", [
        it.sub_recipe_id,
      ]);
      if (sub) {
        const subCost = await yieldCost(sub.id, stack);
        const perUnit = sub.yield_qty > 0 ? subCost / sub.yield_qty : 0;
        total += perUnit * it.qty; // qty is in the sub-recipe's yield units
      }
    }
  }
  stack.delete(recipeId);
  return total;
}

export async function recipeCost(recipeId: string): Promise<RecipeCost | undefined> {
  const r = await get<RecipeRow>("SELECT * FROM recipes WHERE id = ?", [recipeId]);
  if (!r) return undefined;
  const totalRaw = await yieldCost(r.id, new Set());
  const total = Math.round(totalRaw);
  const perUnit = r.yield_qty > 0 ? Math.round(totalRaw / r.yield_qty) : 0;
  const price = r.menu_price_cents;
  const pct = price && price > 0 ? (perUnit / price) * 100 : null;
  return {
    recipe_id: r.id,
    name: r.name,
    kind: r.kind,
    category: r.category,
    yield_qty: r.yield_qty,
    yield_unit: r.yield_unit,
    menu_price_cents: price,
    target_food_cost_pct: r.target_food_cost_pct,
    total_cost_cents: total,
    cost_per_unit_cents: perUnit,
    food_cost_pct: pct == null ? null : Math.round(pct * 10) / 10,
    margin_cents: price == null ? null : price - perUnit,
    over_target:
      pct != null && r.target_food_cost_pct != null && pct > r.target_food_cost_pct,
  };
}

export async function allRecipeCosts(kind?: "dish" | "prep"): Promise<RecipeCost[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM recipes WHERE active = 1 ${kind ? "AND kind = ?" : ""} ORDER BY name`,
    kind ? [kind] : [],
  );
  const out: RecipeCost[] = [];
  for (const { id } of rows) {
    const c = await recipeCost(id);
    if (c) out.push(c);
  }
  // Worst food-cost % first; recipes without a price (nulls) sort last.
  out.sort((a, b) => (b.food_cost_pct ?? -1) - (a.food_cost_pct ?? -1));
  return out;
}

import { ArrowLeft } from "lucide-react";
import { navigate } from "../router";
import { money, pct, qty, useApi } from "../lib";
import { Badge, Card, Chip, Empty, Toolbar, Zone } from "../ui";

interface RecipeCost {
  recipe_id: string;
  name: string;
  kind: string;
  category: string | null;
  yield_qty: number;
  yield_unit: string;
  menu_price_cents: number | null;
  cost_per_unit_cents: number;
  food_cost_pct: number | null;
  margin_cents: number | null;
  over_target: boolean;
}

function foodCostBadge(r: RecipeCost) {
  if (r.food_cost_pct == null) return <Chip>no price</Chip>;
  return (
    <Badge tone={r.over_target ? "danger" : "success"}>{pct(r.food_cost_pct)}</Badge>
  );
}

export function RecipesPage() {
  const { data, loading } = useApi<RecipeCost[]>("/api/recipes");
  const recipes = data ?? [];
  return (
    <>
      <Toolbar title="Recipes" subtitle="Dishes & preps with rolled-up food cost" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Recipes · ${recipes.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : recipes.length === 0 ? (
              <Empty>No recipes yet. Ask your agent to add your menu, or create one.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Yield</th>
                    <th className="py-2 text-right">Cost / unit</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Margin</th>
                    <th className="py-2 text-right">Food cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((r) => (
                    <tr
                      key={r.recipe_id}
                      className="cursor-pointer border-t border-border hover:bg-sunken"
                      onClick={() => navigate(`/recipes/${r.recipe_id}`)}
                    >
                      <td className="py-2">
                        <span className="text-foreground">{r.name}</span>{" "}
                        {r.kind === "prep" && <Chip>prep</Chip>}
                      </td>
                      <td className="py-2 text-muted">
                        {qty(r.yield_qty, r.yield_unit)}
                      </td>
                      <td className="tnum py-2 text-right">{money(r.cost_per_unit_cents)}</td>
                      <td className="tnum py-2 text-right">{money(r.menu_price_cents)}</td>
                      <td className="tnum py-2 text-right text-muted">
                        {money(r.margin_cents)}
                      </td>
                      <td className="py-2 text-right">{foodCostBadge(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Zone>
        </Card>
      </div>
    </>
  );
}

interface Item {
  id: string;
  item_type: string;
  qty: number;
  unit: string | null;
  ingredient_name: string | null;
  ingredient_cost_cents: number | null;
  ingredient_unit: string | null;
  sub_recipe_name: string | null;
}
interface Detail {
  recipe: {
    id: string;
    name: string;
    kind: string;
    category: string | null;
    yield_qty: number;
    yield_unit: string;
    menu_price_cents: number | null;
    target_food_cost_pct: number | null;
    notes: string | null;
  };
  items: Item[];
  cost: RecipeCost;
}

export function RecipeDetailPage({ id }: { id: string }) {
  const { data, loading } = useApi<Detail>(`/api/recipes/${id}`);
  return (
    <>
      <Toolbar
        title={
          <button
            className="flex items-center gap-2"
            onClick={() => navigate("/recipes")}
          >
            <ArrowLeft className="size-4 text-muted" />
            {data?.recipe.name ?? "Recipe"}
          </button>
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {loading || !data ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <Card>
            <Zone eyebrow="Yield & cost">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{data.recipe.kind}</Chip>
                {data.recipe.category && <Chip>{data.recipe.category}</Chip>}
                <span className="text-sm text-muted">
                  yields {qty(data.recipe.yield_qty, data.recipe.yield_unit)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MiniStat label="Cost / unit" value={money(data.cost.cost_per_unit_cents)} />
                <MiniStat label="Menu price" value={money(data.cost.menu_price_cents)} />
                <MiniStat label="Margin" value={money(data.cost.margin_cents)} />
                <div>
                  <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                    Food cost
                  </div>
                  <div className="mt-1">
                    {data.cost.food_cost_pct == null ? (
                      <Chip>no price</Chip>
                    ) : (
                      <Badge tone={data.cost.over_target ? "danger" : "success"}>
                        {pct(data.cost.food_cost_pct)}
                        {data.recipe.target_food_cost_pct != null &&
                          ` · target ${pct(data.recipe.target_food_cost_pct)}`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Zone>
            <Zone eyebrow={`Bill of materials · ${data.items.length}`}>
              <table className="w-full text-sm">
                <tbody>
                  {data.items.map((it) => {
                    const name = it.ingredient_name ?? it.sub_recipe_name ?? "—";
                    const lineCost =
                      it.item_type === "ingredient" && it.ingredient_cost_cents != null
                        ? it.ingredient_cost_cents * it.qty
                        : null;
                    return (
                      <tr key={it.id} className="border-t border-border first:border-0">
                        <td className="py-2">
                          <span className="text-foreground">{name}</span>{" "}
                          {it.item_type === "recipe" && <Chip>prep</Chip>}
                        </td>
                        <td className="tnum py-2 text-right text-muted">
                          {qty(it.qty, it.unit)}
                        </td>
                        <td className="tnum py-2 text-right">
                          {lineCost == null ? "—" : money(Math.round(lineCost))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td className="py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Total batch cost
                    </td>
                    <td />
                    <td className="tnum py-2 text-right font-semibold">
                      {money(data.cost.total_cost_cents)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Zone>
          </Card>
        )}
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className="tnum mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

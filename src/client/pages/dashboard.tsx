import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { navigate } from "../router";
import { money, pct, qty, useApi } from "../lib";
import { Badge, Card, Stat, Toolbar, Zone } from "../ui";

interface RecipeCost {
  recipe_id: string;
  name: string;
  cost_per_unit_cents: number;
  menu_price_cents: number | null;
  food_cost_pct: number | null;
  target_food_cost_pct: number | null;
}
interface Doc {
  id: string;
  name: string;
  kind: string;
  expiry_date: string | null;
  status: string;
}
interface Reorder {
  id: string;
  name: string;
  unit: string;
  on_hand: number | null;
  par_level: number | null;
  suggested_order_qty: number;
  supplier_name: string | null;
}
interface Drift {
  ingredient_id: string;
  name: string;
  unit: string;
  previous_cents: number;
  current_cents: number;
  pct_change: number;
}
interface State {
  food_cost_pct: number | null;
  dishes_over_target: RecipeCost[];
  stock_value_cents: number;
  open_invoices_count: number;
  open_invoices_total_cents: number;
  expiring_documents: Doc[];
  reorder: Reorder[];
  cost_drift: Drift[];
}

export function DashboardPage() {
  const { data, loading } = useApi<State>("/api/state");
  return (
    <>
      <Toolbar title="Dashboard" subtitle="Your kitchen at a glance" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        {loading || !data ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <Card>
              <div className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-4">
                <Stat
                  label="Avg food cost"
                  value={pct(data.food_cost_pct)}
                  meta={`${data.dishes_over_target.length} over target`}
                />
                <Stat
                  label="Stock value"
                  value={money(data.stock_value_cents)}
                  meta="at latest count"
                />
                <Stat
                  label="Open invoices"
                  value={data.open_invoices_count}
                  meta={money(data.open_invoices_total_cents)}
                />
                <Stat
                  label="Expiring docs"
                  value={data.expiring_documents.length}
                  meta="licenses & HACCP"
                />
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <Zone eyebrow={`Dishes over target · ${data.dishes_over_target.length}`}>
                  {data.dishes_over_target.length === 0 ? (
                    <p className="text-sm text-muted">Every dish is on target.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.dishes_over_target.map((d) => (
                        <li
                          key={d.recipe_id}
                          className="flex cursor-pointer items-center justify-between py-2 hover:bg-sunken"
                          onClick={() => navigate(`/recipes/${d.recipe_id}`)}
                        >
                          <span className="text-sm text-foreground">{d.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="tnum text-[0.8125rem] text-muted">
                              {money(d.cost_per_unit_cents)} / {money(d.menu_price_cents)}
                            </span>
                            <Badge tone="danger">{pct(d.food_cost_pct)}</Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Zone>
              </Card>

              <Card>
                <Zone eyebrow={`Cost drift · ${data.cost_drift.length}`}>
                  {data.cost_drift.length === 0 ? (
                    <p className="text-sm text-muted">No price changes recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.cost_drift.map((d) => {
                        const up = d.pct_change >= 0;
                        return (
                          <li
                            key={d.ingredient_id}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-sm text-foreground">{d.name}</span>
                            <span className="flex items-center gap-2">
                              <span className="tnum text-[0.8125rem] text-muted">
                                {money(d.previous_cents)} → {money(d.current_cents)}/{d.unit}
                              </span>
                              <Badge tone={up ? "danger" : "success"}>
                                {up ? (
                                  <TrendingUp className="size-3" />
                                ) : (
                                  <TrendingDown className="size-3" />
                                )}
                                {up ? "+" : ""}
                                {d.pct_change}%
                              </Badge>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Zone>
              </Card>

              <Card>
                <Zone eyebrow={`Reorder now · ${data.reorder.length}`}>
                  {data.reorder.length === 0 ? (
                    <p className="text-sm text-muted">Everything is above par.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.reorder.map((r) => (
                        <li key={r.id} className="flex items-center justify-between py-2">
                          <span className="text-sm text-foreground">
                            {r.name}
                            {r.supplier_name && (
                              <span className="text-muted"> · {r.supplier_name}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tnum text-[0.8125rem] text-muted">
                              {qty(r.on_hand, r.unit)} / par {qty(r.par_level)}
                            </span>
                            <Badge tone="warning">
                              <AlertTriangle className="size-3" />+{qty(r.suggested_order_qty, r.unit)}
                            </Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Zone>
              </Card>

              <Card>
                <Zone eyebrow={`Expiring soon · ${data.expiring_documents.length}`}>
                  {data.expiring_documents.length === 0 ? (
                    <p className="text-sm text-muted">No documents need attention.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.expiring_documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex cursor-pointer items-center justify-between py-2 hover:bg-sunken"
                          onClick={() => navigate("/documents")}
                        >
                          <span className="text-sm text-foreground">{d.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="tnum text-[0.8125rem] text-muted">
                              {d.expiry_date ?? "—"}
                            </span>
                            <Badge tone={d.status === "expired" ? "danger" : "warning"}>
                              {d.status}
                            </Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Zone>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

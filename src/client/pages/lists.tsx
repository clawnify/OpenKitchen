import { money, qty, useApi } from "../lib";
import { Badge, Card, Empty, Toolbar, Zone } from "../ui";

// ─── Suppliers ───────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}
export function SuppliersPage() {
  const { data, loading } = useApi<Supplier[]>("/api/suppliers");
  const rows = data ?? [];
  return (
    <>
      <Toolbar title="Suppliers" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Suppliers · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No suppliers yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Contact</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 text-foreground">{s.name}</td>
                      <td className="py-2 text-muted">{s.contact_name ?? "—"}</td>
                      <td className="py-2 text-muted">{s.email ?? "—"}</td>
                      <td className="py-2 text-muted">{s.phone ?? "—"}</td>
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

// ─── Inventory ───────────────────────────────────────────────────────────────
interface Inv {
  id: string;
  name: string;
  unit: string;
  on_hand: number | null;
  par_level: number | null;
  below_par: boolean;
  counted_at: string | null;
  cost_cents: number;
}
export function InventoryPage() {
  const { data, loading } = useApi<Inv[]>("/api/inventory");
  const rows = data ?? [];
  return (
    <>
      <Toolbar title="Inventory" subtitle="Latest counts vs par" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`On hand · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No ingredients to count yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Ingredient</th>
                    <th className="py-2 text-right">On hand</th>
                    <th className="py-2 text-right">Par</th>
                    <th className="py-2 text-right">Value</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 text-foreground">{r.name}</td>
                      <td className="tnum py-2 text-right">{qty(r.on_hand, r.unit)}</td>
                      <td className="tnum py-2 text-right text-muted">{qty(r.par_level)}</td>
                      <td className="tnum py-2 text-right text-muted">
                        {money((r.on_hand ?? 0) * r.cost_cents)}
                      </td>
                      <td className="py-2">
                        {r.below_par ? (
                          <Badge tone="warning">below par</Badge>
                        ) : (
                          <Badge tone="success">ok</Badge>
                        )}
                      </td>
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

// ─── Production ──────────────────────────────────────────────────────────────
interface Run {
  id: string;
  recipe_name: string;
  qty: number;
  yield_unit: string;
  run_date: string;
  source: string;
}
export function ProductionPage() {
  const { data, loading } = useApi<Run[]>("/api/production-runs");
  const rows = data ?? [];
  return (
    <>
      <Toolbar title="Production" subtitle="What was made — drives theoretical usage" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Runs · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No production logged yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Recipe</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 text-foreground">{r.recipe_name}</td>
                      <td className="tnum py-2 text-right">{qty(r.qty, r.yield_unit)}</td>
                      <td className="tnum py-2 text-muted">{r.run_date}</td>
                      <td className="py-2 text-muted">{r.source}</td>
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

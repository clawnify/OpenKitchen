import { money, qty, useApi } from "../lib";
import { Card, Chip, Empty, Toolbar, Zone } from "../ui";

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  cost_cents: number;
  par_level: number | null;
  allergens: string | null;
}

export function IngredientsPage() {
  const { data, loading } = useApi<Ingredient[]>("/api/ingredients");
  const rows = data ?? [];
  return (
    <>
      <Toolbar title="Ingredients" subtitle="Cost per unit updates when invoices are reconciled" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Ingredients · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No ingredients yet. Your agent adds these as invoices come in.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Cost / unit</th>
                    <th className="py-2 text-right">Par</th>
                    <th className="py-2">Allergens</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 text-foreground">{r.name}</td>
                      <td className="py-2">{r.category && <Chip>{r.category}</Chip>}</td>
                      <td className="tnum py-2 text-right">
                        {money(r.cost_cents)}
                        <span className="text-muted"> /{r.unit}</span>
                      </td>
                      <td className="tnum py-2 text-right text-muted">
                        {qty(r.par_level, r.unit)}
                      </td>
                      <td className="py-2">
                        <span className="flex flex-wrap gap-1">
                          {(r.allergens ?? "")
                            .split(",")
                            .map((a) => a.trim())
                            .filter(Boolean)
                            .map((a) => (
                              <Chip key={a}>{a}</Chip>
                            ))}
                        </span>
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

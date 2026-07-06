import { useState } from "react";
import { ArrowLeft, Check, ScanLine } from "lucide-react";
import { navigate } from "../router";
import { api, money, qty, useApi } from "../lib";
import { Badge, Button, Card, Chip, Empty, Toolbar, Zone } from "../ui";

interface Invoice {
  id: string;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_cents: number;
  status: string;
  source: string;
}

function statusBadge(status: string) {
  if (status === "reconciled") return <Badge tone="success">reconciled</Badge>;
  if (status === "paid") return <Badge tone="success">paid</Badge>;
  return <Badge tone="warning">pending</Badge>;
}

export function InvoicesPage() {
  const { data, loading } = useApi<Invoice[]>("/api/invoices");
  const rows = data ?? [];
  return (
    <>
      <Toolbar title="Invoices" subtitle="Supplier invoices — most arrive already scanned by your agent" />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Invoices · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No invoices yet. Send a photo to your agent on WhatsApp to log the first.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Number</th>
                    <th className="py-2">Date</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-t border-border hover:bg-sunken"
                      onClick={() => navigate(`/invoices/${r.id}`)}
                    >
                      <td className="py-2 text-foreground">{r.supplier_name ?? "—"}</td>
                      <td className="py-2 text-muted">
                        {r.invoice_number ?? "—"}{" "}
                        {r.source === "agent-ocr" && (
                          <Chip>
                            <ScanLine className="mr-1 inline size-3" />
                            scanned
                          </Chip>
                        )}
                      </td>
                      <td className="py-2 text-muted">{r.invoice_date ?? "—"}</td>
                      <td className="tnum py-2 text-right">{money(r.total_cents)}</td>
                      <td className="py-2">{statusBadge(r.status)}</td>
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

interface Line {
  id: string;
  ingredient_name: string | null;
  description: string;
  qty: number;
  unit: string | null;
  unit_cost_cents: number;
  line_total_cents: number;
}
interface Detail {
  invoice: Invoice & { notes: string | null };
  lines: Line[];
}

export function InvoiceDetailPage({ id }: { id: string }) {
  const { data, loading, reload } = useApi<Detail>(`/api/invoices/${id}`);
  const [busy, setBusy] = useState(false);

  async function reconcile() {
    setBusy(true);
    try {
      await api(`/api/invoices/${id}/reconcile`, { method: "POST" });
      reload();
    } finally {
      setBusy(false);
    }
  }

  const pending = data?.invoice.status === "pending";

  return (
    <>
      <Toolbar
        title={
          <button className="flex items-center gap-2" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="size-4 text-muted" />
            {data?.invoice.invoice_number ?? "Invoice"}
          </button>
        }
        action={
          pending && (
            <Button variant="primary" onClick={reconcile} disabled={busy}>
              <Check className="size-4" />
              {busy ? "Reconciling…" : "Reconcile"}
            </Button>
          )
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {loading || !data ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <Card>
            <Zone eyebrow="Invoice">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">
                    {data.invoice.supplier_name ?? "Unknown supplier"}
                  </div>
                  <div className="text-xs text-muted">
                    {data.invoice.invoice_date ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tnum text-lg font-bold">
                    {money(data.invoice.total_cents)}
                  </span>
                  {statusBadge(data.invoice.status)}
                </div>
              </div>
            </Zone>
            <Zone eyebrow={`Line items · ${data.lines.length}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit cost</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-2">
                        <div className="text-foreground">
                          {l.ingredient_name ?? l.description}
                        </div>
                        {l.ingredient_name && (
                          <div className="text-xs text-muted">{l.description}</div>
                        )}
                        {!l.ingredient_name && <Chip>unmatched</Chip>}
                      </td>
                      <td className="tnum py-2 text-right text-muted">
                        {qty(l.qty, l.unit)}
                      </td>
                      <td className="tnum py-2 text-right">{money(l.unit_cost_cents)}</td>
                      <td className="tnum py-2 text-right">{money(l.line_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pending && (
                <p className="mt-3 text-xs text-muted">
                  Reconciling pushes each matched line's unit cost onto the ingredient and
                  records it in price history.
                </p>
              )}
            </Zone>
          </Card>
        )}
      </div>
    </>
  );
}

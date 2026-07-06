import { useApi } from "../lib";
import { Badge, Card, Chip, Empty, Toolbar, Zone } from "../ui";

interface Doc {
  id: string;
  kind: string;
  name: string;
  issuer: string | null;
  reference: string | null;
  expiry_date: string | null;
  status: string;
}

function statusBadge(status: string) {
  if (status === "expired") return <Badge tone="danger">expired</Badge>;
  if (status === "expiring") return <Badge tone="warning">expiring</Badge>;
  return <Badge tone="success">valid</Badge>;
}

export function DocumentsPage() {
  const { data, loading } = useApi<Doc[]>("/api/documents");
  const rows = data ?? [];
  return (
    <>
      <Toolbar
        title="Documents"
        subtitle="Licenses, permits, leases & HACCP — your agent watches the expiries"
      />
      <div className="mx-auto max-w-[75rem] space-y-6 p-6">
        <Card>
          <Zone eyebrow={`Documents · ${rows.length}`}>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <Empty>No documents tracked yet. Add a license, permit or HACCP certificate.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Kind</th>
                    <th className="py-2">Issuer</th>
                    <th className="py-2">Expiry</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="py-2 text-foreground">
                        {d.name}
                        {d.reference && (
                          <div className="text-xs text-muted">{d.reference}</div>
                        )}
                      </td>
                      <td className="py-2">
                        <Chip>{d.kind}</Chip>
                      </td>
                      <td className="py-2 text-muted">{d.issuer ?? "—"}</td>
                      <td className="tnum py-2 text-muted">{d.expiry_date ?? "—"}</td>
                      <td className="py-2">{statusBadge(d.status)}</td>
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

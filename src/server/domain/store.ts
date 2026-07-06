import { get, run } from "../db";

// Generic UUID-keyed table helpers. Table/column names are always code
// literals (never user input); values are parameterised. PKs are UUID TEXT,
// generated here — never enumerable integers (see schema.sql header).

export function newId(): string {
  return crypto.randomUUID();
}

export async function insert(
  table: string,
  data: Record<string, unknown>,
): Promise<string> {
  const id = (data.id as string) ?? newId();
  const row: Record<string, unknown> = { id, ...data };
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  await run(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((k) => row[k]),
  );
  return id;
}

// Only for tables that carry an updated_at column (suppliers, ingredients,
// recipes, invoices, documents).
export async function update(
  table: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const cols = Object.keys(data).filter((k) => data[k] !== undefined);
  if (cols.length === 0) return;
  const sets = cols.map((c) => `${c} = ?`);
  sets.push("updated_at = datetime('now')");
  await run(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`, [
    ...cols.map((c) => data[c]),
    id,
  ]);
}

export async function remove(table: string, id: string): Promise<void> {
  await run(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

export async function byId<T>(table: string, id: string): Promise<T | undefined> {
  return get<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

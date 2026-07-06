import { get, query, run } from "../db";
import { insert } from "./store";

// POS sales sync. A POS integration pulls per-item sales; each POS product id
// maps (via pos_item_map) to a recipe, and the import writes production_runs
// (source='pos') that drive theoretical usage and variance. The pull is the
// agent's job — this module is the target it writes to.

export interface PosMapInput {
  provider: string;
  pos_item_id: string;
  pos_item_name?: string;
  recipe_id: string;
}

export async function listPosMap(provider?: string) {
  return query(
    `SELECT m.*, r.name AS recipe_name
       FROM pos_item_map m LEFT JOIN recipes r ON r.id = m.recipe_id
      ${provider ? "WHERE m.provider = ?" : ""}
      ORDER BY m.provider, m.pos_item_name`,
    provider ? [provider] : [],
  );
}

// Upsert on the (provider, pos_item_id) natural key so re-mapping is idempotent.
export async function upsertPosMap(input: PosMapInput): Promise<string> {
  const existing = await get<{ id: string }>(
    "SELECT id FROM pos_item_map WHERE provider = ? AND pos_item_id = ?",
    [input.provider, input.pos_item_id],
  );
  if (existing) {
    await run(
      "UPDATE pos_item_map SET pos_item_name = ?, recipe_id = ? WHERE id = ?",
      [input.pos_item_name ?? null, input.recipe_id, existing.id],
    );
    return existing.id;
  }
  return insert("pos_item_map", {
    provider: input.provider,
    pos_item_id: input.pos_item_id,
    pos_item_name: input.pos_item_name,
    recipe_id: input.recipe_id,
  });
}

export interface ImportItem {
  pos_item_id: string;
  qty: number;
  name?: string;
}

export interface ImportResult {
  imported: number;
  unmapped: ImportItem[];
  provider: string;
  date: string;
}

// Import one day of POS sales. Idempotent per (provider, date): re-running the
// same day replaces that day's POS runs rather than double-counting, so a daily
// agent sync is safe to retry. Unmapped items are returned so the agent can
// create the missing pos_item_map rows and re-run.
export async function importProduction(
  provider: string,
  date: string,
  items: ImportItem[],
): Promise<ImportResult> {
  await run(
    "DELETE FROM production_runs WHERE source = 'pos' AND note = ? AND run_date = ?",
    [provider, date],
  );
  const unmapped: ImportItem[] = [];
  let imported = 0;
  for (const it of items) {
    const map = await get<{ recipe_id: string }>(
      "SELECT recipe_id FROM pos_item_map WHERE provider = ? AND pos_item_id = ?",
      [provider, it.pos_item_id],
    );
    if (!map) {
      unmapped.push(it);
      continue;
    }
    await insert("production_runs", {
      recipe_id: map.recipe_id,
      qty: it.qty,
      run_date: date,
      source: "pos",
      note: provider,
    });
    imported++;
  }
  return { imported, unmapped, provider, date };
}

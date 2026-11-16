import Dexie, { type Table } from 'dexie';

/** Tablas con `id` + `version` que viajan por la cola de sincronización. */
export const SYNC_TABLES = [
  'locke', 'pokemon_entry', 'award', 'pvp_match', 'category', 'file_asset', 'evidence',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface LocalRow {
  id: string;
  version: number;
  updated_at?: string;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface OutboxOp {
  id?: number;
  table: SyncTable | 'league_team_member';
  kind: 'insert' | 'update' | 'delete';
  rowId: string;
  baseVersion: number;          // versión del servidor sobre la que se editó
  patch: Record<string, unknown>;
  status: 'pending' | 'conflict' | 'error';
  error?: string;
  createdAt: number;
}

export interface LocalConflict {
  id: string;                   // = rowId
  table: SyncTable;
  baseVersion: number;
  local: Record<string, unknown>;
  server: Record<string, unknown>;
  status: 'open' | 'resolved';
  resolution?: Record<string, unknown>;
  createdAt: number;
}

/** Catálogo (solo lectura en el cliente; se copia del servidor para usarlo sin conexión). */
export interface GameGroupRow { id: string; name: string; generation: number | null; sort_order: number; theme: { accent?: string } }
export interface GameRow { id: string; group_id: string | null; name: string; kind: 'main' | 'remake' | 'spinoff' | 'hackrom' | 'fangame'; cover_url: string | null }
export interface GameVersionRow { id: string; game_id: string; label: string; features: Record<string, unknown>; sort_order: number }

export interface FriendshipRow { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted' }
export interface ProfileRow { id: string; username: string; display_name: string; avatar_url: string | null }
export interface TeamMemberRow { locke_id: string; entry_id: string; owner_id?: string }
export interface EntryVersionRow { id: string; entry_id: string; seq: number; event: 'created' | 'edited' | 'evolved' | 'imported'; form_id: string; snapshot: Record<string, unknown>; created_at: string }
export interface SpeciesRow { id: number; name: string; generation: number }
export interface FormRow { id: string; species_id: number; form_key: string; name: string; type1: string; type2: string | null; pokeapi_id: number | null }

class HofDB extends Dexie {
  locke!: Table<LocalRow, string>;
  pokemon_entry!: Table<LocalRow, string>;
  award!: Table<LocalRow, string>;
  pvp_match!: Table<LocalRow, string>;
  category!: Table<LocalRow, string>;
  file_asset!: Table<LocalRow, string>;
  evidence!: Table<LocalRow, string>;
  friendship!: Table<FriendshipRow, string>;
  profile_cache!: Table<ProfileRow, string>;
  entry_version!: Table<EntryVersionRow, string>;
  league_team_member!: Table<TeamMemberRow, [string, string]>;
  species!: Table<SpeciesRow, number>;
  form!: Table<FormRow, string>;
  game_group!: Table<GameGroupRow, string>;
  game!: Table<GameRow, string>;
  game_version!: Table<GameVersionRow, string>;
  outbox!: Table<OutboxOp, number>;
  conflicts!: Table<LocalConflict, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('hof');
    this.version(1).stores({
      outbox: '++id, status, table, rowId',
      conflicts: 'id, status',
      meta: 'key',
      locke: 'id, owner_id, updated_at',
      pokemon_entry: 'id, locke_id, updated_at',
      award: 'id, entry_id, locke_id, updated_at',
      pvp_match: 'id, locke_id, updated_at',
      category: 'id, updated_at',
      file_asset: 'id, locke_id, updated_at',
      evidence: 'id, entry_id, updated_at',
    });
    this.version(2).stores({
      game_group: 'id', game: 'id, group_id', game_version: 'id, game_id',
    });
    this.version(3).stores({
      species: 'id', form: 'id, species_id',
      entry_version: 'id, entry_id, created_at',
      pokemon_entry: 'id, locke_id, updated_at, import_fingerprint',
    });
    this.version(4).stores({ league_team_member: '[locke_id+entry_id], locke_id' });
    this.version(5).stores({ friendship: 'id', profile_cache: 'id' });
    this.version(6).stores({ award: 'id, entry_id, locke_id, owner_id, updated_at', locke: 'id, owner_id, updated_at' });
  }
  rows(table: SyncTable): Table<LocalRow, string> {
    return this.table(table) as Table<LocalRow, string>;
  }
}

export const db = new HofDB();

/**
 * Escritura offline-first: aplica el cambio en local al instante y lo encola.
 * `id` lo genera el cliente (crypto.randomUUID) para poder crear sin conexión.
 */
export async function saveRow(
  table: SyncTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await db.transaction('rw', db.rows(table), db.outbox, async () => {
    const current = await db.rows(table).get(id);
    if (!current) {
      await db.rows(table).put({ id, version: 1, ...patch } as LocalRow);
      await db.outbox.add({
        table, kind: 'insert', rowId: id, baseVersion: 1, patch,
        status: 'pending', createdAt: Date.now(),
      });
      return;
    }
    await db.rows(table).update(id, patch);
    // Si ya hay una edición pendiente de la misma fila, se fusiona (conserva su baseVersion)
    const pending = await db.outbox
      .where('rowId').equals(id).filter((o) => o.status === 'pending').first();
    if (pending?.id !== undefined) {
      await db.outbox.update(pending.id, { patch: { ...pending.patch, ...patch } });
    } else {
      await db.outbox.add({
        table, kind: 'update', rowId: id, baseVersion: current.version, patch,
        status: 'pending', createdAt: Date.now(),
      });
    }
  });
}

/** Papelera: borrado lógico (se restaura con saveRow(..., { deleted_at: null })). */
export const softDelete = (table: SyncTable, id: string) =>
  saveRow(table, id, { deleted_at: new Date().toISOString() });

export type SyncState = 'offline' | 'conflict' | 'pending' | 'synced';
export async function syncState(): Promise<SyncState> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if ((await db.conflicts.where('status').equals('open').count()) > 0) return 'conflict';
  if ((await db.outbox.where('status').equals('pending').count()) > 0) return 'pending';
  return 'synced';
}

/** Equipo de la Liga: no tiene `id` ni versión; se identifica por (locke, ficha). */
export const memberKey = (lockeId: string, entryId: string) => `${lockeId}:${entryId}`;

export async function addTeamMember(lockeId: string, entryId: string): Promise<void> {
  await db.transaction('rw', db.league_team_member, db.outbox, async () => {
    await db.league_team_member.put({ locke_id: lockeId, entry_id: entryId });
    await db.outbox.add({
      table: 'league_team_member', kind: 'insert', rowId: memberKey(lockeId, entryId), baseVersion: 0,
      patch: { locke_id: lockeId, entry_id: entryId }, status: 'pending', createdAt: Date.now(),
    });
  });
}

export async function removeTeamMember(lockeId: string, entryId: string): Promise<void> {
  const key = memberKey(lockeId, entryId);
  await db.transaction('rw', db.league_team_member, db.outbox, async () => {
    await db.league_team_member.delete([lockeId, entryId]);
    const pendingInsert = await db.outbox.where('rowId').equals(key).filter((o) => o.kind === 'insert' && o.status === 'pending').first();
    if (pendingInsert?.id !== undefined) { await db.outbox.delete(pendingInsert.id); return; }   // nunca llegó al servidor
    await db.outbox.add({
      table: 'league_team_member', kind: 'delete', rowId: key, baseVersion: 0,
      patch: { locke_id: lockeId, entry_id: entryId }, status: 'pending', createdAt: Date.now(),
    });
  });
}

/**
 * Los datos de otros usuarios (amigos) se copian al dispositivo para verlos sin conexión.
 * Si dejan de ser visibles (amistad eliminada, ficha pasada a privada) la copia local debe
 * desaparecer también: se borra todo lo ajeno y se reinician los cursores para volver a
 * descargar solo lo que el servidor siga mostrando.
 */
export async function purgeOthersCache(myId: string): Promise<void> {
  const tables = ['locke', 'pokemon_entry', 'award', 'pvp_match', 'file_asset', 'evidence'] as const;
  await db.transaction('rw', [...tables.map((t) => db.rows(t)), db.category, db.league_team_member, db.entry_version, db.meta, db.outbox], async () => {
    const dirty = new Set((await db.outbox.toArray()).map((o) => o.rowId));
    for (const t of tables) {
      // las filas locales sin `owner_id` aún no sincronizadas son mías
      await db.rows(t).filter((r) => !!r.owner_id && r.owner_id !== myId && !dirty.has(r.id)).delete();
    }
    await db.category.filter((c) => c.kind === 'custom' && !!c.owner_id && c.owner_id !== myId).delete();
    await db.league_team_member.filter((m) => !!m.owner_id && m.owner_id !== myId).delete();
    const live = new Set((await db.pokemon_entry.toCollection().primaryKeys()) as string[]);
    await db.entry_version.filter((v) => !live.has(v.entry_id)).delete();
    for (const t of tables) await db.meta.delete(`pull:${t}`);
    await db.meta.delete('pull:category'); await db.meta.delete('pull:entry_version');
  });
}

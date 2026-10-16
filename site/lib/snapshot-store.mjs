// Reading and writing the committed public Explorer snapshot.
//
// site/data/explorer-snapshot.json is the only Explorer input a site build
// reads. It is produced exclusively by scripts/explorer-sync.mjs from a
// published release artifact whose hashes were verified, after the
// publication rules in snapshot.mjs ran. Builds therefore need no network
// access and no Admin/Supabase/D1 traffic, every deploy is reproducible from
// git, and each publish shows up as a readable diff.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EXPLORER } from '../config.mjs';
import { SNAPSHOT_SCHEMA, buildSnapshot } from './snapshot.mjs';
import { sha256 } from './release.mjs';

export const SNAPSHOT_PATH = fileURLToPath(EXPLORER.snapshot);

export function validateSnapshot(s) {
  if (!s || s.schemaVersion !== SNAPSHOT_SCHEMA) throw new Error(`explorer snapshot schemaVersion ${s?.schemaVersion} is not ${SNAPSHOT_SCHEMA}`);
  if (!s.release?.releaseId || !s.release?.publishedAt) throw new Error('explorer snapshot has no release metadata');
  if (!s.entities || typeof s.entities !== 'object' || !Object.keys(s.entities).length) throw new Error('explorer snapshot has no entities');
  for (const [id, e] of Object.entries(s.entities)) {
    if (e.id !== id || !['person', 'place', 'event', 'group'].includes(e.kind) || !e.name) throw new Error(`explorer snapshot entity ${id} is malformed`);
  }
  return s;
}

/** Load for a build. EXPLORER_DB_PATH builds straight from a local release DB (dev, sync render-check). */
export async function loadSnapshot({ env = process.env, path = SNAPSHOT_PATH } = {}) {
  if (env.EXPLORER_DB_PATH) {
    const db = readFileSync(env.EXPLORER_DB_PATH);
    return buildSnapshot(db, {
      corpora: EXPLORER.corpora,
      release: { releaseId: env.EXPLORER_RELEASE_ID || `local-${sha256(db).slice(0, 12)}`, publishedAt: env.EXPLORER_PUBLISHED_AT || new Date(0).toISOString(), dbSha256: sha256(db), source: env.EXPLORER_SOURCE || 'local' },
    });
  }
  if (!existsSync(path)) throw new Error(`no Explorer snapshot at ${path}; run npm run explorer:sync`);
  return validateSnapshot(JSON.parse(readFileSync(path, 'utf8')));
}

/** Atomic write (temp file + rename) so a crash never leaves half a snapshot. */
export function writeSnapshot(snapshot, path = SNAPSHOT_PATH) {
  validateSnapshot(snapshot);
  writeFileSync(`${path}.tmp`, `${JSON.stringify(snapshot, null, 1)}\n`);
  renameSync(`${path}.tmp`, path);
}

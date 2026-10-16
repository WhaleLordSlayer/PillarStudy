#!/usr/bin/env node
// Explorer → website synchronization.
//
//   node scripts/explorer-sync.mjs                       # follow Admin's current published release
//   node scripts/explorer-sync.mjs --dry-run             # verify + render-check, change nothing
//   node scripts/explorer-sync.mjs --from-db <file> --source <label>   # bootstrap from a local release DB
//
// Asks the Cultivate Admin publishing system which Explorer release is
// current (GET /api/public/explorer/current: public, read-only, served from
// R2 only, names finalized published releases only). If it differs from the
// release in site/data/explorer-snapshot.json:
//
//   1. download the release artifact; verify size and both SHA-256 hashes;
//   2. open it and apply the publication rules (site/lib/snapshot.mjs);
//   3. sanity-check it against the current snapshot (no silent emptying);
//   4. render the whole site from it into a scratch directory;
//   5. only then replace site/data/explorer-snapshot.json (atomic rename)
//      and refresh the lastmod and slug ledgers.
//
// Any failure exits non-zero before step 5, so the committed snapshot (and
// therefore the deployed site) stays on the previous valid release. The
// workflow .github/workflows/explorer-sync.yml commits the result; the
// existing Cloudflare build then deploys it atomically.
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_URL, ReleaseError, fetchVerifiedArtifact, sha256, validateDescriptor } from '../site/lib/release.mjs';
import { buildSnapshot } from '../site/lib/snapshot.mjs';
import { SNAPSHOT_PATH, validateSnapshot, writeSnapshot } from '../site/lib/snapshot-store.mjs';
import { EXPLORER } from '../site/config.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const log = (level, msg, extra = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), level, msg, ...extra }));

async function fetchJson(url, { fetchImpl, attempts = 3 }) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new ReleaseError(`HTTP ${res.status} from ${url}`);
      const body = await res.json();
      return body?.data ?? body;
    } catch (e) {
      last = e;
      if (i < attempts) await new Promise(r => setTimeout(r, 500 * i));
    }
  }
  throw last;
}

const total = stats => Object.values(stats.entities).reduce((a, b) => a + b, 0);

/**
 * Exported for tests. Returns { changed, releaseId, previous, report }.
 * Throws on any failure and never writes anything before every check passed.
 */
export async function sync({
  currentUrl = CURRENT_URL,
  snapshotPath = SNAPSHOT_PATH,
  fromDb = null,
  source = 'release',
  dryRun = false,
  allowShrink = false,
  fetchImpl = fetch,
  cacheDir = join(ROOT, 'node_modules/.cache/explorer'),
  writeLedgers = true,
  dataDir,
  build,
} = {}) {
  const previous = existsSync(snapshotPath) ? validateSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8'))) : null;

  // 1. The candidate release bytes, verified.
  let db, release;
  if (fromDb) {
    db = readFileSync(fromDb);
    release = { releaseId: `${source}-${sha256(db).slice(0, 12)}`, publishedAt: new Date().toISOString(), dbSha256: sha256(db), source };
  } else {
    const origin = new URL(currentUrl).origin;
    const current = validateDescriptor(await fetchJson(currentUrl, { fetchImpl }), { origin });
    log('info', 'current published release', { releaseId: current.releaseId, publishedAt: current.publishedAt, pinned: previous?.release.releaseId ?? null });
    if (previous && previous.release.releaseId === current.releaseId && previous.release.dbSha256 === current.artifact.dbSha256) {
      log('info', 'website already on the current release');
      return { changed: false, releaseId: current.releaseId, previous: previous.release.releaseId };
    }
    ({ db } = await fetchVerifiedArtifact(current, { cacheDir, fetchImpl, origin }));
    release = { releaseId: current.releaseId, publishedAt: current.publishedAt, dbSha256: current.artifact.dbSha256, source: 'release' };
  }

  // 2. Publication rules.
  const snapshot = await buildSnapshot(db, { release, corpora: EXPLORER.corpora });
  if (total(snapshot.stats) === 0) throw new ReleaseError('release has no public Explorer records for the published corpora');

  // 3. Guard against a publish that silently empties the site.
  if (previous && !allowShrink && total(snapshot.stats) < total(previous.stats) * 0.75) {
    throw new ReleaseError(`release would drop public records from ${total(previous.stats)} to ${total(snapshot.stats)}; rerun with --allow-shrink to accept`);
  }

  // 4. Render the full site from the candidate into a scratch directory.
  const scratch = mkdtempSync(join(tmpdir(), 'cv-sync-'));
  let report;
  try {
    const candidate = join(scratch, 'candidate.json');
    writeFileSync(candidate, JSON.stringify(snapshot));
    const buildFn = build ?? (await import('../site/build.mjs')).build;
    ({ report } = await buildFn({
      out: join(scratch, 'dist'),
      snapshotOverride: snapshot,
      writeLedgers: writeLedgers && !dryRun,
      ...(dataDir ? { dataDir } : {}),
      log: m => log('info', m),
    }));
    if (!report.pages || report.profiles !== total(snapshot.stats)) throw new ReleaseError('render check failed: page count does not match the release');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  // 5. Commit point.
  if (!dryRun) writeSnapshot(snapshot, snapshotPath);
  log('info', dryRun ? 'dry run: snapshot not changed' : 'snapshot updated', { from: previous?.release.releaseId ?? null, to: release.releaseId, stats: snapshot.stats, changedPages: report.changed, removedPages: report.removed });
  return { changed: !dryRun, releaseId: release.releaseId, previous: previous?.release.releaseId ?? null, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  sync({
    currentUrl: opt('--current-url') ?? CURRENT_URL,
    fromDb: opt('--from-db') ?? null,
    source: opt('--source') ?? 'local',
    dryRun: args.includes('--dry-run'),
    allowShrink: args.includes('--allow-shrink'),
  }).then(r => {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${r.changed}\nrelease_id=${r.releaseId}\n`);
  }).catch(err => {
    log('error', 'sync failed; the website stays on its current release', { error: String(err.message || err) });
    process.exit(1);
  });
}

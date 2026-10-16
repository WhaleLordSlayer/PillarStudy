// Resolves the published Explorer release the website is built from.
//
// The Cultivate Admin publishing pipeline is the only source of truth. It
// exposes finalized, published releases (never working/draft editorial state)
// through two public, read-only, R2-only endpoints:
//
//   GET https://admin.cultivatestudy.com/api/public/explorer/current
//   GET https://admin.cultivatestudy.com/api/public/explorer/releases/<id>/explorer.db.gz
//
// The website pins one release in site/data/explorer-release.json (the
// "pointer"). The sync job (scripts/explorer-sync.mjs) moves the pointer when
// Admin publishes; every build downloads exactly the pinned artifact and
// verifies both SHA-256 hashes before using a single byte of it. A build can
// never mix two releases, and a failed download or hash mismatch fails the
// build, which leaves the previously deployed site serving.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

export const ADMIN_ORIGIN = 'https://admin.cultivatestudy.com';
export const CURRENT_URL = `${ADMIN_ORIGIN}/api/public/explorer/current`;
const RELEASE_ID = /^rel-\d{8}-\d{6}-[0-9a-f]{8}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export class ReleaseError extends Error {}

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Same contract checks the mobile client applies (lib/explorer/releaseCore.ts). */
export function validateDescriptor(d, { origin = ADMIN_ORIGIN } = {}) {
  if (!d || typeof d !== 'object') throw new ReleaseError('release descriptor is not an object');
  const { releaseId, publishedAt, artifact } = d;
  if (typeof releaseId !== 'string' || !RELEASE_ID.test(releaseId)) throw new ReleaseError(`invalid releaseId ${JSON.stringify(releaseId)}`);
  if (typeof publishedAt !== 'string' || Number.isNaN(Date.parse(publishedAt))) throw new ReleaseError('invalid publishedAt');
  if (!artifact || typeof artifact !== 'object') throw new ReleaseError('missing artifact');
  const expectedUrl = `${origin}/api/public/explorer/releases/${releaseId}/explorer.db.gz`;
  if (artifact.url !== expectedUrl) throw new ReleaseError(`artifact url ${artifact.url} is not ${expectedUrl}`);
  if (artifact.encoding !== 'gzip') throw new ReleaseError('artifact encoding must be gzip');
  if (!SHA256.test(artifact.compressedSha256 ?? '') || !SHA256.test(artifact.dbSha256 ?? '')) throw new ReleaseError('artifact hashes missing or malformed');
  if (!Number.isInteger(artifact.compressedSize) || artifact.compressedSize <= 0) throw new ReleaseError('artifact compressedSize missing');
  return {
    releaseId,
    publishedAt: new Date(publishedAt).toISOString(),
    artifact: {
      url: artifact.url,
      encoding: 'gzip',
      compressedSha256: artifact.compressedSha256,
      dbSha256: artifact.dbSha256,
      compressedSize: artifact.compressedSize,
    },
  };
}

/** Download + verify an artifact. Returns the verified, inflated SQLite bytes. */
export async function fetchVerifiedArtifact(descriptor, { cacheDir, fetchImpl = fetch, origin } = {}) {
  const d = validateDescriptor(descriptor, { origin });
  const cached = cacheDir ? join(cacheDir, `${d.releaseId}.db`) : null;
  if (cached && existsSync(cached)) {
    const db = readFileSync(cached);
    if (sha256(db) === d.artifact.dbSha256) return { descriptor: d, db, fromCache: true };
  }
  const res = await fetchImpl(d.artifact.url, { headers: { accept: 'application/gzip' } });
  if (!res.ok) throw new ReleaseError(`artifact download failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  if (gz.length !== d.artifact.compressedSize) throw new ReleaseError(`artifact size ${gz.length} != ${d.artifact.compressedSize}`);
  if (sha256(gz) !== d.artifact.compressedSha256) throw new ReleaseError('compressed SHA-256 mismatch');
  let db;
  try { db = gunzipSync(gz); } catch (e) { throw new ReleaseError(`gunzip failed: ${e.message}`); }
  if (sha256(db) !== d.artifact.dbSha256) throw new ReleaseError('database SHA-256 mismatch');
  if (cached) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(`${cached}.tmp`, db);
    renameSync(`${cached}.tmp`, cached);
  }
  return { descriptor: d, db, fromCache: false };
}

export function readPointer(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return { ...validateDescriptor(raw, { origin: raw.origin ?? ADMIN_ORIGIN }), origin: raw.origin ?? ADMIN_ORIGIN, syncedAt: raw.syncedAt ?? null };
}

export function writePointer(path, descriptor, extra = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify({ ...descriptor, ...extra }, null, 2) + '\n';
  writeFileSync(`${path}.tmp`, body);
  renameSync(`${path}.tmp`, path);
}

/**
 * Resolve the Explorer database for a build.
 *  - EXPLORER_DB_PATH: a local SQLite file (development and tests only). The
 *    page footer and /explorer/release.json say "local" so it is never
 *    mistaken for a published release.
 *  - otherwise: the pinned pointer, downloaded and verified.
 */
export async function resolveExplorerDatabase({ pointerPath, cacheDir, env = process.env, fetchImpl } = {}) {
  if (env.EXPLORER_DB_PATH) {
    const db = readFileSync(resolve(env.EXPLORER_DB_PATH));
    return {
      db,
      release: {
        releaseId: env.EXPLORER_RELEASE_ID || `local-${sha256(db).slice(0, 12)}`,
        publishedAt: env.EXPLORER_PUBLISHED_AT || new Date(0).toISOString(),
        dbSha256: sha256(db),
        source: 'local',
      },
    };
  }
  const pointer = readPointer(pointerPath);
  const { db, descriptor, fromCache } = await fetchVerifiedArtifact(pointer, { cacheDir, fetchImpl, origin: pointer.origin });
  return {
    db,
    release: { releaseId: descriptor.releaseId, publishedAt: descriptor.publishedAt, dbSha256: descriptor.artifact.dbSha256, source: fromCache ? 'release-cache' : 'release' },
  };
}

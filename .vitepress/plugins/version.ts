/**
 * The pmpx version the docs are written against, resolved once per build.
 *
 * Resolved at **build and dev time**, never in the browser: the number is baked into the pages,
 * so a reader sees the version that was current when the site was published, and the site keeps
 * working with no network at all. A runtime fetch would make every page depend on crates.io.
 *
 * ## The fallback chain, in order
 *
 * 1. `PMPX_DOCS_VERSION` — an explicit override, for a release build or a test.
 * 2. A cache younger than `TTL_MS`.
 * 3. crates.io's `max_stable_version`.
 * 4. A stale cache, if the network failed.
 * 5. `FALLBACK`, if there is nothing else.
 *
 * Step 4 is the one worth having: a build on a machine that has fetched before keeps producing
 * correct pages when crates.io is down, rather than reverting to a hardcoded guess. A failed
 * fetch must never fail the build — documentation that cannot be published because a registry is
 * unreachable is worse than documentation with a slightly stale version number.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/** The project root: two levels up from `.vitepress/plugins/`. */
const ROOT = join(HERE, '..', '..')

/**
 * Under `node_modules/.cache/`, the conventional place for a build cache.
 *
 * Not inside `.vitepress/`, which VitePress reserves for source, and not at the project root,
 * where a stray JSON file would look like something a reader should commit. Being under
 * `node_modules` also means a dependency reinstall clears it, which is the right moment for a
 * forgotten version to be noticed.
 */
const CACHE_FILE = join(ROOT, 'node_modules', '.cache', 'pmpx-docs', 'version.json')

/** Six hours. Long enough to keep a dev session off the network, short enough to notice a release. */
const TTL_MS = 6 * 60 * 60 * 1000

/**
 * The last resort, and deliberately the version recorded in `Cargo.toml` when this file was
 * written. If the site is ever built offline from a clean checkout, it should be a *plausible*
 * number rather than `undefined` leaking into a page.
 */
const FALLBACK = '0.7.0'

/** crates.io blocks requests without one, and asks for a way to contact the caller. */
const USER_AGENT = 'pmpx-docs (https://pmpx.dev)'

interface Cache {
  /** The version the last successful fetch produced. Never an override — see `resolve`. */
  version: string
  /** When that happened, in epoch milliseconds. */
  fetchedAt: number
  source: 'crates.io'
}

interface Resolved {
  version: string
  source: string
}

/**
 * Resolved once per process.
 *
 * This is what keeps the server bundle and the client bundle in agreement: `vitepress build`
 * runs both in one process, and a second resolution could land on a different version if a
 * release happened between them — which would be a hydration mismatch on any page showing the
 * number.
 */
let pending: Promise<Resolved> | null = null

function readCache(): Cache | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object')
      return null
    const { version, fetchedAt, source } = parsed as Partial<Cache>
    if (typeof version !== 'string' || !version)
      return null
    if (typeof fetchedAt !== 'number')
      return null
    // Anything whose `source` is not `crates.io` was written by a build that applied an override.
    // Those must never be honoured: the override is gone, but its value would live on.
    if (source !== 'crates.io')
      return null
    return { version, fetchedAt, source }
  }
  catch {
    // Missing, unreadable or corrupt: all three mean "no usable cache".
    return null
  }
}

function writeCache(cache: Cache): void {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true })
    writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
  }
  catch {
    // A read-only checkout should still build; it just will not cache.
  }
}

/** `max_stable_version`, which excludes pre-releases and yanked versions. */
async function fetchFromCratesIo(crate: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://crates.io/api/v1/crates/${crate}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok)
      return null

    const body: unknown = await response.json()
    const version = (body as { crate?: { max_stable_version?: unknown } })?.crate?.max_stable_version
    return typeof version === 'string' && version ? version : null
  }
  catch {
    // Offline, DNS failure, timeout, non-JSON. The caller decides what to fall back to.
    return null
  }
  finally {
    clearTimeout(timer)
  }
}

async function resolve(): Promise<Resolved> {
  const override = process.env.PMPX_DOCS_VERSION?.trim()
  if (override) {
    // Deliberately **not** cached. An override is a decision about *this* build -- a release, a
    // test, a screenshot -- and caching it would outlive the environment variable that asked for
    // it: the next plain `pnpm build` would silently keep the pinned value. That is precisely the
    // staleness this module exists to remove, and it was a real bug here before it was a comment.
    return { version: override, source: 'PMPX_DOCS_VERSION' }
  }

  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { version: cached.version, source: `cache (${cached.source})` }
  }

  const fetched = await fetchFromCratesIo('pmpx', 8000)
  if (fetched) {
    writeCache({ version: fetched, fetchedAt: Date.now(), source: 'crates.io' })
    return { version: fetched, source: 'crates.io' }
  }

  if (cached) {
    return { version: cached.version, source: `stale cache (${cached.source})` }
  }

  return { version: FALLBACK, source: 'built-in fallback' }
}

/** The resolved version. Every caller in one process gets the same answer. */
export function resolveVersion(): Promise<Resolved> {
  pending ??= resolve()
  return pending
}

/** Just the string, for the common case. */
export async function currentVersion(): Promise<string> {
  return (await resolveVersion()).version
}

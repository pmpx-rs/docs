/**
 * Exposes the resolved pmpx version to components and to Markdown.
 *
 * Two surfaces, because the two kinds of page need different things:
 *
 * - **Components** import `virtual:pmpx-version`. A virtual module rather than a `define`, because
 *   `define` substitutes textually and would need every call site to be a bare identifier.
 * - **Markdown** writes `{{pmpx.version}}`. This is the only way to reach a version *inside a
 *   fenced code block* — the case that matters most, since `$ pmpx --version` is followed by the
 *   number.
 *
 * The version is passed in rather than resolved here, so the config file and the two bundles of
 * one build cannot disagree: `resolveVersion()` is memoised per process.
 */

const VIRTUAL_MODULE_ID = 'virtual:pmpx-version'
const RESOLVED_ID = `\0${VIRTUAL_MODULE_ID}`
const TOKEN = /\{\{\s*pmpx\.version\s*\}\}/g

/** Recursively walk every token list, including the children of inline tokens. */
function eachToken(tokens: PmpxMarkdownToken[], visit: (token: PmpxMarkdownToken) => void): void {
  for (const token of tokens) {
    visit(token)
    if (token.children)
      eachToken(token.children, visit)
  }
}

/** Replaces the placeholder in one string, resetting the regex first — it is `/g` and stateful. */
function substitute(text: string, version: string): string {
  TOKEN.lastIndex = 0
  return TOKEN.test(text) ? text.replace(TOKEN, version) : text
}

/**
 * One line per build, not per Vite build.
 *
 * `vitepress build` runs two Vite builds (server, then client) and each calls the plugin's
 * `config` hook, so printing from there produced the same line twice. The flag lives at module
 * scope, which in one Node process means once.
 */
let reported = false

/** Prints where the version came from, once. Exported so the config can call it eagerly. */
export function reportVersion(version: string, source: string): void {
  if (reported || process.env.PMPX_DOCS_QUIET)
    return
  reported = true
  console.log(`  pmpx docs version: ${version}  (${source})`)
}

/**
 * The Vite plugin: a virtual module holding the version.
 *
 * A plain object rather than a factory, because it carries no state worth closing over — the
 * value it serves is already decided by the time `vitepress` calls the config.
 */
export function pmpxVersionModule(version: string, source: string) {
  return {
    name: 'pmpx:version-module',

    config() {
      reportVersion(version, source)
    },

    resolveId(id: string) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_ID : null
    },

    load(id: string) {
      if (id !== RESOLVED_ID)
        return null
      return `export const version = ${JSON.stringify(version)}\nexport default version\n`
    },
  }
}

/**
 * The markdown-it rule, for `markdown.config` in the VitePress config.
 *
 * Registered `after('inline')` rather than as a `text` rule: a `text` rule only sees text runs the
 * inline parser already produced, and fenced code is never parsed as inline at all. Walking the
 * finished token list covers prose, inline code and fenced code in one pass.
 */
export function pmpxVersionMarkdown(version: string) {
  return (md: PmpxMarkdown): void => {
    md.core.ruler.after('inline', 'pmpx-version', (state) => {
      eachToken(state.tokens, (token) => {
        if (typeof token.content !== 'string' || token.content === '')
          return

        // Prose, the contents of inline code spans, and fenced/indented code. Any other token
        // type has `content` that is not display text.
        if (
          token.type === 'text'
          || token.type === 'code_inline'
          || token.type === 'fence'
          || token.type === 'code_block'
        ) {
          token.content = substitute(token.content, version)
        }
      })
    })
  }
}

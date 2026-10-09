/**
 * Type declarations for modules this project consumes without a resolvable type package.
 *
 * `vue-tsc` reads TypeScript's module resolution, not the bundler's. A package that Vite can
 * bundle happily is still "cannot find module" to it when the types live behind a path pnpm has
 * not exposed at the top level, or when the package ships no types at all.
 */

/**
 * `virtual:pmpx-version` is resolved by `.vitepress/plugins/versionPlugin.ts`, not by
 * `node_modules`. The runtime implementation lives there.
 */
declare module 'virtual:pmpx-version' {
  /** The pmpx version the docs were built against, resolved from crates.io at build time. */
  export const version: string
  export default version
}

/**
 * `markdown-it`, described structurally rather than by re-declaring its module.
 *
 * VitePress bundles its own copy of the markdown-it types. That `MarkdownIt` is not assignable to
 * a class from a separately installed `@types/markdown-it` of a different patch — their `utils`
 * namespaces disagree on one method and their `use` overloads do not line up — and declaring the
 * module here collides with VitePress's types instead of complementing them.
 *
 * A structural description sidesteps the identity problem entirely: whatever object VitePress
 * passes satisfies these members, so the rule still gets real checking on the parts it touches.
 */
interface PmpxMarkdownToken {
  type: string
  content: string
  children?: PmpxMarkdownToken[] | null
}

interface PmpxMarkdownState {
  tokens: PmpxMarkdownToken[]
}

interface PmpxMarkdown {
  /**
   * `any`, not `unknown`. markdown-it's `use` takes a plugin whose parameter type is a specific
   * signature, and function parameters are contravariant — `unknown` would reject every real
   * plugin. Each overload of the real `use` returns `MarkdownIt` itself, so the chain is
   * `any`-shaped in practice.
   */
  use: (plugin: any, options?: any) => unknown
  core: {
    ruler: {
      after: (
        afterName: string,
        ruleName: string,
        rule: (state: PmpxMarkdownState) => void,
      ) => void
    }
  }
}

/**
 * `markdown-it-task-lists` ships no types and has no `@types` package.
 *
 * The only call site is `md.use(taskLists, { enabled, label })`, so a permissive factory is an
 * accurate description rather than a shortcut.
 */
declare module 'markdown-it-task-lists' {
  const taskLists: (md: unknown, options?: Record<string, unknown>) => void
  export default taskLists
}

/** Stylesheets imported for their side effect only. Vite handles them; TypeScript needs telling. */
declare module '*.css' {
  const stylesheet: string
  export default stylesheet
}

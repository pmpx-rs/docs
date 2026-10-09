import antfu from '@antfu/eslint-config'

/**
 * Lint configuration for the docs site.
 *
 * `@antfu/eslint-config` covers the three languages this repo actually contains -- TypeScript,
 * Vue and Markdown -- and auto-fixes formatting, so there is no Prettier here. It respects
 * `.gitignore` on its own.
 */
export default antfu({
  type: 'lib',

  // Explicit rather than detected: `vue` is a dependency for VitePress itself, so the detection
  // would be right by accident, and stating it makes the intent greppable.
  typescript: true,
  vue: true,

  // Markdown is checked rather than skipped. This is what validates the fenced snippets: an
  // unclosed tag or an undefined binding in an example is a reader-facing error, and TypeScript
  // never looks inside a fence.
  markdown: true,

  // `.vitepress/`, `dist/` and `node_modules/` come from `.gitignore`.
  ignores: ['.version-cache.json'],

  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  rules: {
    // The Vite plugin's hooks receive whatever Vite passes, and the token walk is deliberately
    // loose. Both would need speculative types to satisfy the rule.
    'ts/no-use-before-define': 'off',

    // Off for the same reason it is off in most application code: annotating every arrow makes
    // the build plugins and composables noisier without making them safer. Inferred returns are
    // still checked against their call sites.
    'ts/explicit-function-return-type': 'off',

    // Reported on `while (token === run)` in `animation.ts`, where both are reassigned across
    // `await`. The rule only looks within one synchronous pass and cannot see that.
    'no-unmodified-loop-condition': 'off',

    // A `::: details` block or a `<style>` section legitimately holds several sibling blocks.
    'vue/max-attributes-per-line': 'off',
  },
}, {
  // `virtual:pmpx-version` is resolved by `.vitepress/plugins/versionPlugin.ts`, not by
  // node_modules. Without this, it reads as an unresolvable import.
  name: 'pmpx/virtual-module',
  files: ['**/*.{ts,vue}'],
  rules: {
    'import/no-unresolved': 'off',
  },
}, {
  // The VitePress config, and only it.
  name: 'pmpx/vitepress-config',
  files: ['.vitepress/config.mts'],
  rules: {
    // `defineConfig` is not async, so the version fetched from crates.io has to be awaited at the
    // top level before the object literal can be built. That is the whole mechanism.
    'antfu/no-top-level-await': 'off',
  },
}, {
  // Build-time code: the version resolver, the Vite plugin, the structure checker.
  name: 'pmpx/build-tools',
  files: ['.vitepress/plugins/**/*.ts', 'scripts/**/*.mjs'],
  rules: {
    // A build that cannot say which version it resolved is a build nobody can debug.
    'no-console': 'off',

    // `process` is a real global in these files; they never run in a browser.
    'node/prefer-global/process': 'off',
  },
}, {
  /**
   * Plain JavaScript, parsed as JavaScript.
   *
   * `scripts/*.mjs` has no type annotations, so the TypeScript parser cannot tell a value from a
   * type and reports every local as "only used as a type" -- 24 false positives on one file.
   * Turning the TypeScript rules off here is more honest than annotating a plain script for a
   * checker that should not have been applied to it.
   */
  name: 'pmpx/plain-js',
  files: ['scripts/**/*.mjs'],
  rules: {
    'unused-imports/no-unused-vars': 'off',
  },
})

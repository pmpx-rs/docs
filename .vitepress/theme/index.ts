// The single theme both locales extend.
//
// This file is the theme VitePress resolves for the root locale, and it is also the one the
// Chinese site re-exports (`theme/zh/index.ts`), so there is exactly one implementation. The
// `en/` and `zh/` directories exist only because VitePress looks for a locale's theme at
// `<locale>/theme/index.*` and treats a locale directory without one as an error.
//
// Everything shared lives in `./shared/`: components, composables and styles.
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Home from './shared/components/Home.vue'
import './shared/styles/tokens.css'
import './shared/styles/chrome.css'

export const pmpxTheme = {
  extends: DefaultTheme,

  // A custom layout rather than the default `layout: home`: the hero has to hold a live
  // component (the detection animation), which frontmatter cannot express. Every other page
  // falls through to the default layout, so the docs stay on stock VitePress.
  Layout: Home,
} satisfies Theme

export default pmpxTheme

import { fileURLToPath } from 'node:url'
import taskLists from 'markdown-it-task-lists'
import { defineConfig } from 'vitepress'
import { resolveVersion } from './plugins/version'
import { pmpxVersionMarkdown, pmpxVersionModule } from './plugins/versionPlugin'

const REPO = 'https://github.com/pmpx-rs/pmpx'

/**
 * The pmpx version these docs describe, fetched from crates.io once per build.
 *
 * Resolved here, at the top level, because the navigation badge needs it while the config object
 * is being built. The same value is handed to the plugin, so the badge in the config and any
 * `{{pmpx.version}}` in a page can never disagree.
 *
 * Awaited rather than fetched lazily: `defineConfig` is not async, and the value has to exist
 * before the object literal is evaluated.
 */
const { version: PMPX_VERSION, source: VERSION_SOURCE } = await resolveVersion()

/**
 * `pmpx-docs/dist`, resolved from this file rather than from whatever the build's working
 * directory happens to be.
 *
 * `outDir` is interpreted against Vite's root, which differs between `vitepress build` and
 * `vitepress build docs`, so a bare relative path is not stable across the two.
 */
const OUT_DIR = fileURLToPath(new URL('../dist', import.meta.url))

/** Sidebar of the English site, and the reference for the Chinese one. */
const enSidebar = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Introduction', link: '/guide/introduction' },
      { text: 'Installation', link: '/guide/installation' },
      { text: 'Quick Start', link: '/guide/quick-start' },
    ],
  },
  {
    text: 'Core Concepts',
    items: [
      { text: 'How pmpx Detects a Project', link: '/guide/detection' },
      { text: 'Resolving a Backend', link: '/guide/resolution' },
      { text: 'Configuration', link: '/guide/configuration' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Command Reference', link: '/reference/commands' },
      { text: 'Global Flags', link: '/reference/global-flags' },
      { text: 'Plugins & the Store', link: '/reference/plugins' },
      { text: 'JSON Output', link: '/reference/json' },
      { text: 'Exit Codes', link: '/reference/exit-codes' },
      { text: 'Self Update', link: '/reference/self-update' },
    ],
  },
  {
    text: 'Plugins',
    items: [
      { text: 'Building a Plugin', link: '/plugins/authoring' },
      { text: 'API Overview', link: '/plugins/api' },
      { text: 'FAQ', link: '/faq' },
    ],
  },
]

/**
 * The Chinese sidebar mirrors the English one exactly -- same page names, same order -- so a
 * reader who switches locale keeps their bearings. Only the labels differ.
 */
const zhSidebar = [
  {
    text: '开始使用',
    items: [
      { text: '简介', link: '/zh/guide/introduction' },
      { text: '安装', link: '/zh/guide/installation' },
      { text: '快速上手', link: '/zh/guide/quick-start' },
    ],
  },
  {
    text: '核心概念',
    items: [
      { text: '自动探测原理', link: '/zh/guide/detection' },
      { text: '后端解析', link: '/zh/guide/resolution' },
      { text: '配置', link: '/zh/guide/configuration' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: '命令参考', link: '/zh/reference/commands' },
      { text: '全局参数', link: '/zh/reference/global-flags' },
      { text: '插件与插件商店', link: '/zh/reference/plugins' },
      { text: 'JSON 输出', link: '/zh/reference/json' },
      { text: '退出码', link: '/zh/reference/exit-codes' },
      { text: '自更新', link: '/zh/reference/self-update' },
    ],
  },
  {
    text: '插件开发',
    items: [
      { text: '编写一个插件', link: '/zh/plugins/authoring' },
      { text: 'API 总览', link: '/zh/plugins/api' },
      { text: '常见问题', link: '/zh/faq' },
    ],
  },
]

const repoNav = [
  { text: 'Guide', link: '/guide/introduction', activeMatch: '^/guide/' },
  { text: 'Reference', link: '/reference/commands', activeMatch: '^/reference/' },
  { text: 'Plugins', link: '/plugins/authoring', activeMatch: '^/plugins/' },
  {
    text: `v${PMPX_VERSION}`,
    items: [
      { text: 'Changelog', link: `${REPO}/releases` },
      { text: 'crates.io', link: 'https://crates.io/crates/pmpx' },
    ],
  },
]

const zhRepoNav = [
  { text: '指南', link: '/zh/guide/introduction', activeMatch: '^/zh/guide/' },
  { text: '参考', link: '/zh/reference/commands', activeMatch: '^/zh/reference/' },
  { text: '插件', link: '/zh/plugins/authoring', activeMatch: '^/zh/plugins/' },
  {
    text: `v${PMPX_VERSION}`,
    items: [
      { text: '更新日志', link: `${REPO}/releases` },
      { text: 'crates.io', link: 'https://crates.io/crates/pmpx' },
    ],
  },
]

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'pmpx',
  description:
    'One command surface for a project\u2019s package managers. pmpx detects what a project is, translates a fixed set of verbs, and spawns the real tool \u2014 with zero backends built into the binary.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  // Relative to this config file's directory in the source, but passed to VitePress as an
  // absolute path so it cannot be reinterpreted. The site lands in `pmpx-docs/dist`.
  outDir: OUT_DIR,

  /**
   * Keep the repository's own README out of the site.
   *
   * VitePress uses the project root as its source directory, so a root `README.md` becomes a page
   * -- and its `[LICENSE](LICENSE)` link then fails the dead-link check, because `LICENSE` is a
   * file rather than a route. The README addresses people browsing the repository, not readers of
   * the site, and every page that belongs on the site lives under a locale directory anyway.
   */
  srcExclude: ['README.md'],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0b0b0f' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'pmpx' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Detect the project type, translate a fixed set of verbs, spawn the real tool.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  // Shared by both locales. Anything locale-specific lives under `locales` below.
  markdown: {
    /**
     * GitHub-style task lists, e.g. the pre-flight checklist in `plugins/authoring.md`.
     *
     * VitePress only gained built-in task-list support after 1.6.4 -- the version this site is
     * pinned to. Its markdown guide has no Task Lists section and its default theme ships no
     * `task-list` styles at all, so `- [ ]` rendered as the literal text `[ ]`. Verified against
     * this version's own docs before adding the plugin, rather than assuming the newer guide
     * applied.
     *
     * `enabled: false` keeps the checkboxes non-interactive: these are things a reader confirms
     * about their own plugin, not a form on the page. The styles in `chrome.css` finish the job,
     * because the plugin marks up the HTML but ships no CSS.
     *
     * `pmpxVersionMarkdown` is the other half of the version plugin: it substitutes
     * `{{pmpx.version}}` while a page renders, which is the only way to reach a version inside a
     * fenced code block.
     */
    config: (md) => {
      md.use(taskLists, { enabled: false, label: true })
      pmpxVersionMarkdown(PMPX_VERSION)(md)
    },
  },

  // The version, as a virtual module, for components that need it. `{{pmpx.version}}` in Markdown
  // is handled above instead, because a virtual module cannot reach inside a code fence.
  vite: {
    plugins: [pmpxVersionModule(PMPX_VERSION, VERSION_SOURCE)],
  },

  themeConfig: {
    logo: '/brand-mark.svg',
    siteTitle: 'pmpx',
    socialLinks: [{ icon: 'github', link: REPO }],

    /**
     * Three levels in the right-hand outline, site-wide.
     *
     * `themeConfig`, not `markdown`: VitePress 1.6.4's `MarkdownOptions` has no `outline` field,
     * so setting it there is a type error and is ignored at runtime. The Chinese locale overrides
     * this with its own `outline` to translate the label.
     *
     * Three rather than the default two, because a page written as `## section` then `### item`
     * otherwise offers no way to jump to the items -- and those items are usually the point.
     */
    outline: { level: [2, 3] },

    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    externalLinkIcon: true,
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'pmpx',
      description:
        'One command surface for a project\u2019s package managers. Detect the project type, translate a fixed set of verbs, spawn the real tool.',
      themeConfig: {
        nav: repoNav,
        sidebar: enSidebar,
        editLink: {
          pattern: `${REPO}/edit/main/README.md`,
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'One command surface, no built-in backends.',
        },
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        search: { provider: 'local' },
      },
    },

    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'pmpx',
      description: '一条命令统一项目里的包管理器。自动探测项目类型，翻译固定动词，调用真正的工具。',
      // No `markdown` block here on purpose. Overriding container titles per locale was added to
      // VitePress after 1.6.4 -- this version's `LocaleSpecificConfig` has no such field, so a
      // block here would be silently ignored and the Chinese pages would keep English titles.
      // Every container therefore carries an explicit title; see `.vitepress/writing-style.md`.
      themeConfig: {
        nav: zhRepoNav,
        sidebar: zhSidebar,
        editLink: {
          pattern: `${REPO}/edit/main/README_CN.md`,
          text: '在 GitHub 上编辑此页',
        },
        footer: {
          message: '基于 MIT 协议开源发布。',
          copyright: '一条命令表面，二进制内不内置任何后端。',
        },
        docFooter: { prev: '上一页', next: '下一页' },
        search: { provider: 'local' },
      },
    },
  },

  sitemap: {
    hostname: 'https://pmpx.dev',
  },

  /**
   * Canonical URLs, and the pairing between the two languages.
   *
   * `cleanUrls` is on, so `/guide/detection` and `/guide/detection.html` would otherwise be two
   * addresses for one page; the canonical link is what picks one. VitePress does not emit
   * `hreflang` alternates on its own, and without them a search engine treats the English and
   * Chinese pages as unrelated duplicates rather than as translations of one another.
   *
   * The Chinese page's path maps to the English one and back by adding or stripping the leading
   * `/zh`, which is exactly how `locales.zh.link` defines the split.
   */
  transformHead({ pageData }) {
    const relative = pageData.relativePath.replace(/(index)?\.md$/, '')
    const isZh = relative.startsWith('zh/')
    const shared = isZh ? relative.slice(3) : relative

    const origin = 'https://pmpx.dev/'
    const en = origin + shared
    // `/` and `/zh/` are the two locales' home pages -- an empty `shared` still needs its slash.
    const zh = origin + (shared ? `zh/${shared}` : 'zh/')

    return [
      ['link', { rel: 'canonical', href: isZh ? zh : en }],
      ['link', { rel: 'alternate', hreflang: 'en', href: en }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: zh }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: en }],
    ]
  },
})

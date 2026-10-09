# Documentation style

The rules the pmpx docs are written to. They exist because a page of consecutive paragraphs with
no headings reads as a wall — see `guide/introduction.md` for the page these were derived from.

This file is a working reference, not published content. It is not linked from any page.

## Structure first, spacing second

Most "the text is too dense" complaints are a structure problem, not a leading problem.

- **Break parallel content into `###`.** If a section holds four points that each begin with a
  bolded phrase, those are four subsections, not four paragraphs. `plugins/api.md` and
  `reference/global-flags.md` are the worst offenders: neither has a single `h3`.
- **One idea per paragraph**, two to four sentences. A paragraph that runs past five is usually
  two paragraphs, or a list.
- **A list beats a paragraph that enumerates things.** If you are writing "the first is…, the
  second is…", use a list.
- **A table beats a list of parallel facts.** If every item has the same two or three attributes,
  the attributes are columns.
- **Keep manual line breaks at ~100 columns** in source. The published line width comes from CSS,
  not from the source; the source width is for editing.

## VitePress modules, and when each one earns its place

All of these are built in. Use them; do not add styling or custom components.

| Module | Use it for |
| --- | --- |
| `::: code-group` | Two or more interchangeable ways to do the same thing — per-platform, per-shell, per-tool. **Not** for showing sequential steps. |
| `::: tip` | The main shortcut, or a rule worth remembering. At most one per section. |
| `::: info` | Background that helps but is not required. |
| `::: warning` | Something that will bite the reader: a data-loss risk, a silent misbehaviour, a platform difference with consequences. |
| `::: danger` | Destructive and irreversible. |
| `::: details` | Deep material that interrupts the main line of an explanation: wire formats, full tables, the long reasoning behind a decision, a complete example. |
| `> [!NOTE]` etc. | GitHub-flavoured alerts. Rendered identically to the containers above; prefer `:::` in this project for consistency. |
| `- [ ]` / `- [x]` | Task lists, for a short set of things the reader confirms. Non-interactive here — they are a checklist, not a form. |
| `**bold**` / `*italic*` / `` `code` `` | Inline emphasis. Do not bold a whole sentence. |

A container's title is **required**, not optional: `::: tip Just want to try it?` rather than a
bare `::: tip`.

This is a hard rule here rather than a preference. VitePress 1.6.4 — the version this site is
pinned to — cannot translate container titles per locale: its `LocaleSpecificConfig` has no
`markdown` field, so `markdown.container` under `locales.zh` is silently ignored. A bare `::: tip`
on a Chinese page therefore renders the English word `TIP`. Writing an explicit title on every
container sidesteps the limitation entirely and reads better anyway.

### Two features that are not built in

Both were found by reading this version's own docs rather than the current ones on the website,
which describe a newer VitePress:

| Feature | Status in 1.6.4 | What this site does |
| --- | --- | --- |
| Task lists (`- [ ]`) | Not supported. No Task Lists section in its markdown guide, and no `task-list` rules in the default theme. | `markdown-it-task-lists` in `.vitepress/config.mts`, plus the task-list block in `chrome.css` — the plugin marks up the HTML and ships no CSS. |
| Per-locale container titles | Not supported (`LocaleSpecificConfig` has no `markdown` field). | Every container carries an explicit title; see above. |

The lesson generalises: when a VitePress feature seems to do nothing, check the pinned version's
own `docs/` directory before assuming the configuration is wrong.

## The version number

Never type the pmpx version. It is fetched from crates.io once per build by
`.vitepress/plugins/version.ts` and reachable two ways:

| Where | How |
| --- | --- |
| Markdown, including inside fenced code | `{{pmpx.version}}` |
| A Vue component | `import { version } from 'virtual:pmpx-version'` |

The Markdown placeholder is the one that matters most, because the version usually appears in
console output — `$ pmpx --version` is followed by `pmpx {{pmpx.version}}`. A virtual module
cannot reach inside a code fence, which is why there are two mechanisms.

Resolved at build and dev time, never in the browser: the site keeps working with no network, and
a reader sees the version that was current when the page was published. `PMPX_DOCS_VERSION`
overrides it; the cache lives under `node_modules/.cache/pmpx-docs/` and lasts six hours.

**Do not substitute versions that mean something else.** The `0.3.0` in `pmpx plugin ls` output is
a *plugin* version and `1.82` / `1.88` are MSRVs — those are fixed facts about the crates, not the
current release, and replacing them with the pmpx version would make them wrong.

## Consistency across languages

`guide/` and `zh/guide/` are the same document in two languages. They must stay structurally
identical:

- the same `h2` / `h3` at the same positions and in the same order;
- the same containers in the same places, with translated titles;
- the same tables with the same rows;
- the same code blocks **byte for byte** — code, comments inside fences, and command output are
  never translated;
- links carrying the `/zh` prefix on the Chinese side, with anchors dropped.

## What not to touch

Rewriting for layout must not change meaning:

- commands, flags, file names, paths, crate and type names, numbers;
- quoted console output inside code fences;
- the technical claims — the 100/10/50 scores, the ABI major, the exit codes, which markers are
  `strong` versus `weak`;
- existing internal links and their targets;
- frontmatter, except where a page genuinely needs a page-level setting.

If a sentence is unclear while you are restructuring it, leave the wording alone and note it in
your report rather than guessing.

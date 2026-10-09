# PMPX Docs

The website and documentation for [pmpx](https://github.com/pmpx-rs/pmpx) — one command surface
for a project's package managers.

**Live at [pmpx.dev](https://pmpx.dev)**

> `pmpx` detects what a project is, translates a fixed set of verbs into what that tool actually
> spells, and spawns it. Zero backends in the binary.

## What is here

- **A home page** with an animated terminal showing the fork: one `pmpx` command in, three
  ecosystems out. The typing is driven by a single typewriter, so every line moves together.
- **The guide** — installation, the detection model, how a backend is resolved, configuration.
- **The reference** — every verb and flag, the plugin store, the JSONL event stream, exit codes.
- **Plugin authoring** — the contract, the ABI boundary, and a checklist.

Written twice, in English at `/` and Simplified Chinese at `/zh/`. The two are kept structurally
identical; `pnpm check` enforces it.

## Development

```bash
pnpm install
pnpm dev        # dev server
pnpm build      # -> dist/
pnpm preview    # serve the built site
pnpm lint       # ESLint over TypeScript, Vue and Markdown
pnpm typecheck  # vue-tsc
pnpm check      # compare the English and Chinese halves
pnpm check:all  # all three
```

`simple-git-hooks` runs ESLint on staged `.ts`, `.mts`, `.vue` and `.md` files before each commit.
Set `SKIP_SIMPLE_GIT_HOOKS=1` to bypass it.

No environment variables or global pnpm settings are needed — `pnpm-workspace.yaml` carries the one
exception this dependency tree requires.

## How it is built

[VitePress](https://vitepress.dev). Two things are worth knowing before editing:

**The version number is never typed.** It is fetched from crates.io once per build, and appears as
`{{pmpx.version}}` in Markdown or `virtual:pmpx-version` in a component. `PMPX_DOCS_VERSION`
overrides it; `pnpm version:clear` forces a refetch.

**`.vitepress/writing-style.md`** holds the layout rules — when to use a heading, a container or a
`details`, and which features VitePress 1.6.4 does not have despite what the current online docs
describe. Read it before adding a page.

## Licence

MIT — see [LICENSE](LICENSE). The documentation is released under the same licence as pmpx itself.

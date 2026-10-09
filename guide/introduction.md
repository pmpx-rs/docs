# Introduction

`pmpx` is **one command surface for a project's package managers**.

It reads the files a repository already has, works out which package manager owns it, translates
a fixed set of verbs into what that tool actually spells, and spawns it. There is no config file
to write first and nothing to initialise.

::: tip Just want to try it?
[Install a plugin](/guide/installation), then run the same command you already run.
:::

```console
$ pmpx install serde            # a Rust project    → cargo add serde
$ pmpx install lodash           # a frontend repo   → pnpm add lodash
$ pmpx test -- --nocapture      #                   → cargo test --nocapture
$ pmpx exec tsc --noEmit        #                   → pnpm exec tsc --noEmit
```

The same four commands, in four different repositories, reaching three different tools.

## The problem it solves

Which command runs in this directory?

```console
$ ls
Cargo.toml  package.json  pnpm-lock.yaml  pnpm-workspace.yaml
```

Is this `cargo build` or `pnpm build`? Nothing in your shell knows, so you either remember it or
you go and look. Multiply that by every repository you touch in a week, and by every teammate who
has to be told.

`pmpx` answers the question once, mechanically, from evidence the project already contains:

```console
$ pmpx
Project root  /home/you/code/some-repo
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

## What makes it different

### One vocabulary of verbs

`install`, `remove`, `run`, `build`, `test`, `update` and `exec` mean the same thing everywhere.
What changes is the translation:

| You type | Node (pnpm) | Rust (cargo) |
| --- | --- | --- |
| `pmpx install` | `pnpm install` | `cargo fetch` |
| `pmpx install lodash` | `pnpm add lodash` | `cargo add lodash` |
| `pmpx remove lodash` | `pnpm remove lodash` | `cargo remove lodash` |
| `pmpx run dev` | `pnpm run dev` | `cargo run dev` |
| `pmpx build` | `pnpm build` | `cargo build` |
| `pmpx test` | `pnpm test` | `cargo test` |
| `pmpx update` | `pnpm update` | `cargo update` |
| `pmpx exec tsc` | `pnpm exec tsc` | *(no answer — pmpx runs it)* |

### Zero backends in the binary

Every ecosystem is a plugin, `dlopen`ed at runtime. The binary ships none of them, so it stays
small and a plugin does not have to be built with the same compiler as the host.

### Detection loads no plugin code

Scoring reads the manifests the plugins declare, and nothing else. Running `pmpx` in a repository
that never installed a plugin executes no third-party code at all.

### The tie-break is yours

Two priority arrays in your global config decide what "mixed project" means. The default is
Node-first, but that is a default, not a rule — see [Resolving a Backend](/guide/resolution).

## What it does not do

`pmpx` only ever writes its own files: `~/.pmpx/**`, the global config, and — when you ask for it
— a project's `.pmpx.toml`. There is **no cache file in your project**, because a cache would save
under a millisecond and cost you a dirty working tree.

It is not a proxy, a mirror or a registry client. It does not read `~/.npmrc`, `~/.cargo/config.toml`,
`~/.yarnrc.yml` or any other tool's configuration, and it has no registry feature of any kind.
Configure those in your shell or in each tool's own config; `pmpx` inherits the environment as-is
when it spawns. The full list of things it deliberately never touches is in the
[FAQ](/faq).

## Requirements

- **Rust 1.88+** — to build from source.
- **At least one plugin** — `pmpx` detects nothing without one. That is deliberate: a built-in
  backend would be a backend you cannot update without updating `pmpx`.

## Where to go next

- [Installation](/guide/installation) — the binary, then a plugin. Neither works alone.
- [Quick Start](/guide/quick-start) — install, ask what a directory is, run something.
- [How pmpx Detects a Project](/guide/detection) — the scoring, and why ties exist.

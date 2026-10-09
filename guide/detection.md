# How pmpx Detects a Project

Detection answers one question: **which installed plugin owns this directory?**

It does that without loading a single line of plugin code. Scoring reads the marker names each
plugin declares in its manifest, checks which of those files exist, and adds up points.

::: tip The property worth stating plainly
Running `pmpx` in a repository that never installed a plugin executes **no third-party code at
all**. Detection never `dlopen`s anything.
:::

## Step 1 — find the project root

`pmpx` walks upward from the directory you ran it in, looking for a directory containing a file
any installed plugin recognises. Then it stops.

Three settings control the walk, all in the global config's `[discovery]` table:

| Key | Default | Meaning |
| --- | --- | --- |
| `walk_up` | `true` | `false` checks only the starting directory, like `--no-walk-up` |
| `max_depth` | `8` | How many directories may be checked at most, the start included |
| `stop_at_git` | `true` | Do not look above a repository root — anything up there is a different project |

```toml
# <config-dir>/pmpx/config.toml
[discovery]
max_depth = 8
stop_at_git = true
```

`pmpx info` reports what the walk did, in words:

```console
$ pmpx info
Start         /home/you/code/monorepo/packages/web
Project root  /home/you/code/monorepo
Walk-up       3 directories, stopped because: .git
```

## Step 2 — score every candidate

Each plugin manifest declares two lists of filenames:

```toml
# pnpm's pmpx-plugin.toml
[detect]
strong = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml"
]
weak = [ "package.json" ]
```

The two tiers are the whole idea:

| Tier | Score | What a hit proves |
| --- | --- | --- |
| `strong` | **100** | a lockfile, workspace file or shape marker — **this backend actually resolved the project** |
| `weak` | **10** | a manifest file — **this only proves the ecosystem** |

For every installed plugin, `pmpx` checks each declared name against the project root and sums
the hits. A `package.json` alone gives every Node backend 10 points and identifies none of them;
`pnpm-lock.yaml` gives pnpm 100 and settles it.

### A worked example

A pnpm monorepo root, with a Cargo crate sharing the directory:

```text
package.json         pnpm-lock.yaml       pnpm-workspace.yaml       Cargo.toml
```

| Plugin | Family | Hits | Score |
| --- | --- | --- | --- |
| `pnpm` | node | `package.json` +10, `pnpm-lock.yaml` +100, `pnpm-workspace.yaml` +100 | **210** |
| `npm` | node | `package.json` +10 | 10 |
| `yarn` | node | `package.json` +10 | 10 |
| `bun` | node | `package.json` +10 | 10 |
| `cargo` | rust | `Cargo.toml` +10 | 10 |

Two families are in play — `node` at 210, `rust` at 10 — and Node wins. That is not a hardcoded
rule; see [Resolving a Backend](/guide/resolution).

### Families take the maximum, never the sum

Within one family, `pmpx` keeps the **highest-scoring plugin** rather than adding the plugins
together. `npm`, `yarn` and `bun` all match `package.json` for 10 points each; that is 30 points
of coincidence, not 30 points of evidence, so the family scores 10.

::: tip Why that matters
It is what makes one family's score comparable to another's, even when one ecosystem has four
backends installed and the other has one.
:::

## Step 3 — apply pins

A pin in `.pmpx.toml` gives its family a **floor of 50**:

```toml
[plugin]
rust = "cargo"
```

A floor, not a replacement. The family's score becomes `max(scored, 50)`:

| Situation | Scored | After a pin | Winner |
| --- | --- | --- | --- |
| `Cargo.toml` only, vs. `package.json` only | rust 10, node 10 | rust **50**, node 10 | **rust** |
| `Cargo.toml` only, vs. `pnpm-lock.yaml` | rust 10, node 110 | rust **50**, node 110 | **node** |

::: warning Evidence outranks intent
The second row is the point. A pin says *"I know this is a Rust project"* — it does not say
*"ignore the pnpm lockfile that is sitting right there"*. To genuinely override evidence, use
`-p`, which is a per-invocation flag rather than a stored setting precisely because it is blunt.
:::

## Step 4 — resolve, and report

Scoring produces families; resolution picks one. It is described in
[Resolving a Backend](/guide/resolution), and the reasoning behind the result is available
without running anything:

```console
$ pmpx --explain build
```

## The known failure mode

A **library crate that gitignores `Cargo.lock`** scores 10 from `Cargo.toml`. If a `package.json`
sits in the same directory, `node` also scores 10, and Node wins on the default family priority.

::: warning This is not a bug to be patched
**Without a lockfile you genuinely cannot tell.** The two-tier score exists to make that
unknowable-ness visible rather than to paper over it. The way out is to say what you mean:

```console
$ pmpx plugin set cargo
```
:::

## What detection reads

Only names. `pmpx` asks whether a declared file exists; it does not open it, parse it, hash it or
interpret it.

::: details The one exception, and why it is opt-in
A plugin may declare files it wants the *contents* of, in its own manifest:

```toml
[context]
files = [
  "package.json",
  ".yarnrc.yml"
]
```

Even then the reading and parsing belong to the plugin — `pmpx` never learns what is inside. This
is how Yarn distinguishes classic from Berry, where the only evidence is the presence of
`.yarnrc.yml`, without the host having to know anything about Yarn.
:::

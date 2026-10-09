# Quick Start

## 1. Install a plugin

`pmpx` ships no backends, so the first thing to do is give it one. The name expands to a crate:
`pnpm` becomes `pmpx-plugin-pnpm`.

```console
$ pmpx plugin add pnpm
$ pmpx plugin add cargo
```

Check what you have:

```console
$ pmpx plugin ls
node
  pnpm      0.3.0
rust
  cargo     0.3.0
```

::: tip Which plugins are available
`pmpx plugin search <keyword>` looks on crates.io. The official ones live under the `pmpx-rs`
organisation — see [Plugins & the Store](/reference/plugins).
:::

## 2. Ask what this directory is

Change into any project you have and run `pmpx` with no arguments. It runs nothing — it reports
the decision.

```console
$ cd ~/code/my-frontend
$ pmpx
Project root  /home/you/code/my-frontend
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

`score 220` is `pnpm-lock.yaml` (100) + `pnpm-workspace.yaml` (100) + `package.json` (10). For the
whole story, including every candidate that lost:

```console
$ pmpx info
```

That output is a table of what matched and how much each marker was worth — the fastest way to
understand why a given repository resolved the way it did.

## 3. Run something

Now the verbs behave the way you would expect, in whatever repository you are standing in.

```console
$ pmpx install            # install the whole tree
$ pmpx install lodash     # add a dependency
$ pmpx run dev            # run a script
$ pmpx build
$ pmpx test
$ pmpx remove lodash
$ pmpx update
```

Every one of those works unchanged in a Rust repository, where they reach `cargo` instead:

```console
$ cd ~/code/my-crate
$ pmpx install            # → cargo fetch
$ pmpx install serde      # → cargo add serde
$ pmpx test               # → cargo test
```

### Passing arguments through

Everything after `--` goes to the backend untouched. `pmpx` does not parse it, does not reorder
it, and does not warn about it.

```console
$ pmpx test -- --nocapture
$ pmpx run dev -- --port 3000
```

::: tip Why the separator is kept for `run`
`pmpx run dev -- --port 3000` means *"the script `dev`, with `--port 3000` passed on"*. A backend
has to be able to tell that apart from arguments belonging to `run` itself, and only your original
command line carries the distinction — so it is preserved rather than flattened.
:::

### The escape hatch

`exec` is the one verb a backend is allowed to have no answer for. When it does not, `pmpx` runs
the command itself:

```console
$ pmpx exec tsc --noEmit
$ pmpx exec ls -la          # works with zero plugins installed
```

Every other verb reports an error instead of guessing — an explicit exception, not silent magic.

## 4. See the translation

If you want to know what is about to run without running it:

```console
$ pmpx --explain build
```

And to watch it happen, with the engine's own timings:

```console
$ pmpx --debug build
```

## 5. Pin it, if the guess is wrong

A library crate that gitignores `Cargo.lock` scores 10 from `Cargo.toml` and can lose to a
`package.json` next door. When that happens, say so instead of arguing with the priority arrays:

```console
$ pmpx plugin set cargo
```

That writes the nearest `.pmpx.toml`:

```toml
[plugin]
rust = "cargo"
```

::: warning A pin is a floor, not an override
It gives its family 50 points. That beats weak evidence and deliberately **loses** to a real
lockfile — a pin says *"I know this is a Rust project"*, not *"ignore the lockfile"*.
:::

To override evidence as well, use the one-off flag:

```console
$ pmpx -p cargo build
```

## Where to go next

- [How pmpx Detects a Project](/guide/detection) — the scoring, in full.
- [Resolving a Backend](/guide/resolution) — families, priorities and pins.
- [Command Reference](/reference/commands) — every verb, flag and alias.

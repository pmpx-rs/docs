# Command Reference

## Verbs

Seven verbs are translated by the backend. Everything after `--` is passed through untouched.

| Verb | Aliases | No arguments | With arguments |
| --- | --- | --- | --- |
| `install` | `i`, `add` | install from the lockfile | add a dependency |
| `remove` | `rm`, `uninstall` | — | remove a dependency |
| `run` | `r` | — | run a script / target |
| `build` | `b` | build | forwarded to the backend |
| `test` | `t` | test | forwarded to the backend |
| `update` | `up` | update dependencies | update the named ones |
| `exec` | `x` | — | escape hatch, see below |

```console
$ pmpx install            # install the whole tree
$ pmpx install serde      # add a dependency
$ pmpx run dev            # run a script
$ pmpx test               # run the tests
$ pmpx update             # update the lockfile
$ pmpx exec tsc --noEmit  # run a command through the backend
```

`remove` requires at least one package name; `install`, `run`, `update` and `exec` have a
no-argument form. Which no-argument forms a given backend supports is the backend's business, and
`pmpx` reports `2` when it has no answer rather than inventing one.

::: tip What each verb becomes, per backend
The full `pmpx` → `pnpm` → `cargo` mapping is in the [Introduction](/guide/introduction).
:::

### Passing arguments through

Everything after `--` goes to the backend verbatim. `pmpx` does not parse it, reorder it or warn
about it.

```console
$ pmpx test -- --nocapture
$ pmpx run dev -- --port 3000
$ pmpx build -- --release
```

::: tip Why the separator is kept for `run`
A plugin has to be able to tell the target's own arguments from arguments to pass through —
`cargo run -- --release` means something different from `cargo run --release` — and only your
original command line carries that distinction.
:::

### `install` with no arguments

| Backend | Resolves to |
| --- | --- |
| pnpm | `pnpm install` |
| npm | `npm install` |
| yarn | `yarn install` |
| bun | `bun install` |
| cargo | `cargo fetch` |

`cargo fetch` rather than `cargo build`, because the verb is *install*: it is about making the
dependencies present, not about compiling.

## `exec` — the escape hatch

```
pmpx exec <cmd...>
   ├─ plugin supports exec     → its answer (npx, pnpm exec, …)
   └─ it does not, or no project → pmpx runs the command itself
```

This is the only verb allowed to degrade:

```console
$ pmpx exec ls -la     # works with zero plugins installed, outside any project
```

::: warning Every other verb fails loudly
A `pmpx build` that quietly ran something else when the backend had no answer would be worse than
a failure, so it reports an error and exits `2` instead.
:::

## Other commands

| Command | What it does |
| --- | --- |
| `pmpx` | What this directory is, and which plugin will run. Runs nothing. |
| `pmpx info` | Everything: the walk, config files, pins, all candidates and scores, the loaded plugin's build info |
| `pmpx plugin ls` | Installed plugins, grouped by family (reads manifests only — no `dlopen`) |
| `pmpx plugin current` | The current plugin per family, plus candidates and scores |
| `pmpx plugin set <name>` | Pin a plugin in the nearest `.pmpx.toml` |
| `pmpx plugin unset [family]` | Delete a pin |
| `pmpx plugin add <name>` | Install a plugin |
| `pmpx plugin rm <name>` | Remove a plugin |
| `pmpx plugin update [name]` | Update plugins |
| `pmpx plugin search <keyword>` | Search crates.io |
| `pmpx plugin info <name>` | A plugin's local state and its crates.io information |
| `pmpx config get <key>` | Read one global config key |
| `pmpx config set <key> <value>` | Write one global config key |
| `pmpx completion <shell>` | Print a completion script to stdout |
| `pmpx self update` | Replace this binary |

The plugin commands are covered in [Plugins & the Store](/reference/plugins); `self update` in
[Self Update](/reference/self-update).

## `pmpx`

With no subcommand and no flags, `pmpx` states what it sees and stops. It runs nothing and loads
no plugin.

```console
$ pmpx
Project root  /home/you/code/my-frontend
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

Two exit codes are possible: `0` when something was found, `3` when no project was detected.

::: tip Usable as a test in a script
```bash
if pmpx -q >/dev/null 2>&1; then
  echo "this is a pmpx project"
fi
```
:::

## `pmpx info`

The only command that loads the winning plugin **without running it**, because the diagnostics it
prints — the version and target the plugin was compiled with — only exist inside the loaded
library.

```console
$ pmpx info
Start         /home/you/code/monorepo/packages/web
Project root  /home/you/code/monorepo
Walk-up       3 directories, stopped because: .git
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"

Installed plugins
  pnpm       node      v0.3.0
  cargo      rust      v0.3.0
  yarn       node      v0.3.0

Candidates and scores
  node  score 210
    pnpm     score  210   package.json, pnpm-lock.yaml, pnpm-workspace.yaml
    yarn     score   10   package.json
    npm      score   10   package.json
  rust  score  10
    cargo    score   10   Cargo.toml

Selected      yarn (pmpx-plugin-yarn)
  reported name  yarn
  reported family node
  compiled with  rustc 1.88.0
  target         x86_64-unknown-linux-gnu
```

::: tip Reading a surprising result
Check the `pinned` line against the scores. A pin gives its family a 50-point floor, and that
floor is visible in the number — which is usually the whole explanation.
:::

## `pmpx completion`

Prints a completion script to stdout and nothing else, so you redirect it yourself:

::: code-group

```bash [bash]
pmpx completion bash > ~/.local/share/bash-completion/completions/pmpx
```

```zsh [zsh]
pmpx completion zsh > ~/.zfunc/_pmpx
```

```powershell [PowerShell]
pmpx completion powershell | Out-String | Invoke-Expression
```

```fish [fish]
pmpx completion fish > ~/.config/fish/completions/pmpx.fish
```

:::

## Exit codes

The full table is on its own page — [Exit Codes](/reference/exit-codes) — but the one that
matters when you are deciding whether to use `pmpx` in CI:

> `pmpx test` exits with **the backend's own exit code**. It has to fail when the tests fail.

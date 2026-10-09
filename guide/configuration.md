# Configuration

`pmpx` has two configuration layers, and they have different jobs.

| Layer | File | Committed? | Purpose |
| --- | --- | --- | --- |
| Global | `<config-dir>/pmpx/config.toml` | no — it is yours | Priority arrays, discovery limits, store settings |
| Per project | `.pmpx.toml` | **yes** — it belongs to the repo | Which backend this project uses |

There is no third layer and no cache file. Nothing is written into your project unless you ask
for it.

## Where the global config lives

| Platform | Path |
| --- | --- |
| Linux | `~/.config/pmpx/config.toml` |
| macOS | `~/Library/Application Support/pmpx/config.toml` |
| Windows | `%APPDATA%\pmpx\config\config.toml` |

::: tip The doubled `config` on Windows is intentional
`ProjectDirs` lays `RoamingAppData\<app>\config` out that way, and released versions of `pmpx`
read that file. Tidying the path up would silently move every Windows user's configuration, so
it stays.
:::

### Environment overrides

Two environment variables override the locations outright, for tests and for multi-environment
setups:

| Variable | Replaces |
| --- | --- |
| `PMPX_CONFIG_DIR` | the global config **directory** (`config.toml` is read from inside it) |
| `PMPX_DATA_DIR` | the plugin data directory |

## The global config, in full

A missing file means **all defaults**, not an error. A *broken* file is an error, not a silent
default — quietly ignoring a config you wrote is worse than saying so.

```toml
# <config-dir>/pmpx/config.toml

[plugin]
# Family order. Decides ties between families -- nothing else.
family_priority = [
  "node",
  "rust",
  "python",
  "go",
  "jvm",
  "dotnet",
  "php",
  "ruby"
]
# Plugin order inside one family. Decides ties between plugins.
priority = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
  "cargo"
]

[discovery]
# false = only look at the directory you ran pmpx in
walk_up = true
# How many directories may be checked at most, the start included
max_depth = 8
# Do not look above a repository root -- anything up there is a different project
stop_at_git = true

[plugin_store]
# Override the plugin directory. Empty = the default (`~/.pmpx`)
data_dir = "~/.pmpx"
# Download a prebuilt plugin when the release has one, instead of building on this machine
prefer_prebuilt = true
```

Every key is optional; each one falls back individually.

### The two priority arrays break ties

Neither array overrides evidence. They break **ties**:

::: details The complete default value of both arrays

```toml
[plugin]
family_priority = [
  "node",
  "rust",
  "python",
  "go",
  "jvm",
  "dotnet",
  "php",
  "ruby"
]
priority = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
  "cargo"
]
```

:::

A repository with both a `package.json` and a `Cargo.toml` and no lockfile scores `node` 10 and
`rust` 10. Node wins because it is first. **That is the entire implementation of "mixed projects
default to Node"** — there is no such rule in the code. Move `rust` to the front and the same
repository goes to `cargo`:

```toml
[plugin]
family_priority = [
  "rust",
  "node",
  "python",
  "go",
  "jvm",
  "dotnet",
  "php",
  "ruby"
]
```

See [Resolving a Backend](/guide/resolution) for the full precedence table.

## Reading and writing config

```console
$ pmpx config get plugin.family_priority
$ pmpx config get discovery.max_depth
$ pmpx config set discovery.max_depth 3
```

`config get` takes a **dotted path** so a nested key is reachable without editing TOML by hand.

### `config set` writes the global config only

It never touches a project `.pmpx.toml`, because a command with no project context silently
editing your repository would be a surprise. The value is parsed according to the type the key
already has, so `config set discovery.max_depth 3` writes the number `3` rather than the string
`"3"`, and an array key stays an array.

### Unknown keys are preserved

Both config structs carry their unrecognised content through, so a read-modify-write — anything
`config set` or `plugin set` does — cannot silently delete a key from a newer or older `pmpx`
version.

Writes are atomic: a temporary file in the same directory, then a rename, so an interrupted write
never leaves a half-file behind.

## Project config

`.pmpx.toml` says which backend a project uses:

```toml
# .pmpx.toml
[plugin]
node = "pnpm" # pin Node to pnpm, and give node a 50-point floor
rust = "cargo"

[scripts]
# A name the project defines for itself, answered before any plugin is involved
fmt = "cargo fmt --all"
lint = { args = [
  "clippy",
  "--all-targets",
  "--",
  "-D",
  "warnings"
] }
```

### Files stack, nearest wins

`.pmpx.toml` files are collected **upward** from the working directory, and among them the
**nearest wins**:

```text
monorepo/
├── .pmpx.toml            node = "pnpm"
├── package.json
└── packages/
    └── web/
        ├── .pmpx.toml    node = "yarn"     ← wins for anything under web/
        └── package.json
```

A nearer file overlays a further one key by key; it does not replace it wholesale. That is what
lets a monorepo set a default at the root and override one package.

`pmpx plugin set <name>` writes the **nearest** `.pmpx.toml`, creating it if it does not exist.
The key it writes is the **family** the plugin belongs to, so `pmpx plugin set yarn` writes
`node = "yarn"`.

::: warning Nearest wins, not the root
A root `.pmpx.toml` sets a default, and a nearer file overlays it key by key. In a monorepo, the
package you are in can therefore disagree with the file you are looking at.
:::

### `[scripts]`

A named script is answered by the project itself, before any plugin is asked. It is a convenience
for the person, not something a plugin translates:

```toml
[scripts]
fmt = "cargo fmt --all"
lint = { args = [
  "clippy",
  "--all-targets",
  "--",
  "-D",
  "warnings"
] }
```

```console
$ pmpx run fmt -- --check          # → cargo fmt --all --check
$ pmpx run lint                    # → clippy --all-targets -- -D warnings
```

Both spellings work: a **string** is a shell-style line, an **`args` array** is a program and its
arguments with no shell involved. Anything you type after the name is appended, which is what
makes `pmpx run fmt -- --check` work without a second mechanism.

`{ args = [...] }` is the one to prefer when the command needs to work on Windows too, since it
never depends on how a shell would have split the string.

## Inspecting what was read

`pmpx info` prints every project config file that was collected, in order, plus the pins it found:

```console
$ pmpx info
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"
```

That list is the answer to *"why did it pick that?"* more often than the scores are.

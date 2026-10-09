# Plugins & the Store

Every backend is a plugin. The `pmpx` binary contains none of them, which is the design rather
than an omission: a backend compiled into the binary could not be updated without updating `pmpx`,
and a third-party backend for an ecosystem `pmpx` has never heard of would need a release from the
`pmpx` maintainers to exist.

## Where plugins live

| | |
| --- | --- |
| Directory | `~/.pmpx/plugins/` — the same path on Linux, macOS and Windows |
| Overridable with | `PMPX_DATA_DIR`, or `[plugin_store] data_dir` |
| Contents | one directory per plugin, holding the built cdylib and its `pmpx-plugin.toml` manifest |

The location is deliberately *inside the user's reach* rather than in a platform data directory:
the plugin directory is something you will want to look at when a plugin misbehaves, and "the
location `pmpx` shows" and "the location the store actually uses" are the same value handed to the
store rather than two implementations.

## Managing plugins

```console
$ pmpx plugin ls                    # grouped by family; alias: list
$ pmpx plugin ls --flat             # no grouping
$ pmpx plugin current               # current per family, plus candidates and scores
$ pmpx plugin add pnpm              # install (name expands to pmpx-plugin-pnpm)
$ pmpx plugin add pnpm --version 0.3.0
$ pmpx plugin rm pnpm
$ pmpx plugin update                # all of them
$ pmpx plugin update pnpm
$ pmpx plugin search pnpm
$ pmpx plugin info pnpm
```

::: tip Listing plugins runs no third-party code
`plugin ls` reads manifests only — **no `dlopen` happens** — so listing your plugins never executes
third-party code.
:::

```console
$ pmpx plugin ls
node
  pnpm      0.3.0
  yarn      0.3.0
rust
  cargo     0.3.0
```

### From a local checkout

`plugin add` takes a **path** as happily as a name. The rule is what the argument *is*, not how it
is spelled: something that resolves to a directory containing `pmpx-plugin.toml` is a checkout,
everything else is a crate name.

```console
$ cd ~/code/pmpx-plugin-mine
$ pmpx plugin add .
```

`pmpx` prints where each plugin came from, which is the thing you want to know when a plugin does
not match what is published:

```console
$ pmpx plugin add pnpm
Installing pnpm...
  pmpx-plugin-pnpm v0.3.0 (prebuilt) -> /home/you/.pmpx/plugins/pnpm
```

| Source | Meaning |
| --- | --- |
| `prebuilt` | a binary from the release was downloaded |
| `built locally` | built on this machine from the published source |
| `built from <path>` | built from a checkout you named |

Which one is used is `[plugin_store] prefer_prebuilt`, `true` by default. Turning it off means
every install compiles from source — slower, and useful on a platform with no prebuilt archive.

Installing a **checkout** is vetted first, because there is one thing the store cannot check from
the manifest alone: whether *this host* will be able to use the plugin. The check compares the
plugin's ABI major against the host's, so a mismatch is reported as a version problem to fix
rather than as an unexplained load failure later.

## Pinning

```console
$ pmpx plugin set yarn      # writes the nearest .pmpx.toml
$ pmpx plugin unset node    # delete one family's pin
$ pmpx plugin unset --yes   # delete all of them
```

`plugin set` writes the **family** key, so `pmpx plugin set yarn` produces `node = "yarn"`. The
file it writes is the nearest `.pmpx.toml`, created if it does not exist.

`plugin unset` with no family deletes every pin, which is why it requires `--yes`: it is the one
form of this command that can throw away several decisions at once.

Pins are described in [Resolving a Backend](/guide/resolution).

## The plugin manifest

Each installed plugin carries a `pmpx-plugin.toml`. It is what `plugin ls`, detection and version
checking read — no code is loaded to answer any of those questions.

### The fields

```toml
[plugin]
name = "pnpm"
version = "0.3.0"
abi = 3
family = "node"

[detect]
strong = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml"
]
weak = [ "package.json" ]

[context]
files = [ "package.json" ]
```

| Key | Read by | Meaning |
| --- | --- | --- |
| `plugin.name` | the host, before loading | Must equal `PackageManager::name()`; a mismatch refuses the load |
| `plugin.version` | `plugin ls`, updates | Must equal the crate's `Cargo.toml` version |
| `plugin.abi` | the host, before loading | Must equal the host's `PMPX_ABI_MAJOR` |
| `plugin.family` | grouping, scoring, pins | The ecosystem this backend belongs to |
| `detect.strong` | detection | 100 points per hit |
| `detect.weak` | detection | 10 points per hit |
| `context.files` | the plugin, at call time | Files whose **contents** the plugin may read |

::: warning A name or ABI mismatch refuses the load
The host refuses to load a library whose reported name disagrees with the manifest, or whose ABI
major differs from its own; a mismatch is a version problem to fix, not a crash to diagnose.
:::

## ABI compatibility

The plugin ABI is versioned, and the major version is checked at load:

| | |
| --- | --- |
| Constant | `PMPX_ABI_MAJOR` |
| Current | `3` |
| Checked | before the plugin's code runs at all |
| Failure | a typed load error, not a crash |

### Two consequences worth knowing

- **A plugin need not share your rustc.** The cdylib boundary is a C ABI of `#[repr(C)]` tables
  and plain numbers, so a plugin built by a different compiler version works, as long as the ABI
  major matches.
- **A minor bump is compatible.** `abi = 3` keeps working when the host moves within major 3.

## Writing your own

### The short version

See [Building a Plugin](/plugins/authoring). The short version: implement one trait, add one line,
and use the starter template.

```console
$ git clone https://github.com/pmpx-rs/pmpx-plugin-starter
$ cd pmpx-plugin-starter
$ pmpx plugin add .
```

# FAQ

## General

### Is `pmpx` a replacement for pnpm / cargo / npm?

No. It is a **front end** for them. Your package manager still does the work, still owns the
lockfile, and still reads its own configuration. `pmpx` decides which one to call and translates
the verb.

### Why "pmpx"?

It is a package-manager proxy: the `pm` verb surface, with an `x` for the detection behind it.
The binary is named `pmpx`.

### Does it need to be configured before it works?

No. Detection reads files the project already has, and the global config is optional — a missing
file means all defaults. The one thing it needs is a plugin.

### Does it work on Windows?

Yes, natively — not only under WSL. Windows is where the program-resolution work shows: `pmpx`
resolves the real path before spawning, because `Command::new("pnpm")` fails there. `CreateProcessW`
does no `PATHEXT` resolution, and pnpm installs as `pnpm.cmd`.

## Installation and plugins

### Why does `pmpx` say it detects nothing?

Because no plugin is installed.

::: tip That is the design, not missing configuration
A built-in backend would be a backend you could not update without updating `pmpx`.
:::

```console
$ pmpx plugin add pnpm
$ pmpx plugin add cargo
```

### Which plugins exist?

`pmpx plugin search` looks on crates.io, and the official ones live under the `pmpx-rs`
organisation:

| Ecosystem | Plugin |
| --- | --- |
| Node | `pmpx-plugin-pnpm`, `pmpx-plugin-npm`, `pmpx-plugin-yarn`, `pmpx-plugin-bun` |
| Rust | `pmpx-plugin-cargo` |

Any family without a published plugin can be added by writing one — see
[Building a Plugin](/plugins/authoring).

### Can I use `pmpx` for a language nobody has written a plugin for?

Not yet, and `pmpx` will not pretend otherwise: it exits `3` with *"no plugin for it"*. The
`Family` type is open specifically so that the plugin someone writes next does not need a `pmpx`
release to be recognised.

### Do plugins need to be built with the same Rust version as `pmpx`?

No. The boundary is a C ABI of `#[repr(C)]` tables and plain numbers, checked against
`PMPX_ABI_MAJOR` at load. A plugin built by a different compiler works as long as the ABI major
matches.

### Does `pmpx` run plugin code just to list plugins?

::: tip Listing loads no plugin code
No. `plugin ls`, detection and the version check all read `pmpx-plugin.toml`. A plugin's library is
loaded only when its command is actually needed.
:::

## Behaviour

### It picked the wrong backend. What do I do?

Find out why first — the answer is usually visible:

```console
$ pmpx info          # every candidate and every score
$ pmpx --explain build
```

Then either pin it:

```console
$ pmpx plugin set cargo
```

or override it once:

```console
$ pmpx -p cargo build
```

### Why did it choose Node when this is obviously a Rust project?

Because nothing said so. A **library crate that gitignores `Cargo.lock`** scores 10 from
`Cargo.toml`; a `package.json` next door also scores 10; Node wins on the default family order.

::: warning Without a lockfile you genuinely cannot tell
That is the known failure mode, and it is not a rule to be patched. `pmpx plugin set cargo` is the
way out. See [How pmpx Detects a Project](/guide/detection).
:::

### Is "mixed projects default to Node" hardcoded?

No. It is the default `family_priority` array, and you can edit it:

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

Move `rust` to the front and the same mixed repository goes to `cargo`. There is no rule anywhere
in the code.

### Why does `pmpx build` exit `2`?

Because the backend has no answer for `build`. Every verb except `exec` reports that rather than
guessing at something plausible — `--explain` will show you which plugin was asked.

### Why does `pmpx exec` work with no plugins at all?

`exec` is the one verb allowed to degrade: when no backend answers, `pmpx` runs the command
itself. It is an escape hatch, and an escape hatch that needed a plugin would be a poor one.

## Output

### Can I parse it?

Yes:

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

::: tip stdout is JSONL and nothing else
Everything meant for a person — including the backend's own output — goes to stderr. See
[JSON Output](/reference/json).
:::

### Why does `--json plugin ls` fail?

Because that command's result is a table, and mixing prose into a stream a caller is parsing would
produce a parse error somewhere with no visible connection to `pmpx`. It refuses with exit `2`
instead.

### Why is my command's output not in the JSON stream?

By design. Under `--json` the backend writes to stderr, which is what keeps stdout parseable. If
you want the backend's output in a file, redirect stderr:

```bash
pmpx --json install > events.jsonl 2> install.log
```

### Can I turn off the `pmpx → cargo build` line?

```console
$ pmpx -q build
```

`--quiet` silences the narration on stderr. The backend's output is untouched.

## Files and state

### Where does `pmpx` write?

Three places, all of them its own:

| Path | What |
| --- | --- |
| `<config-dir>/pmpx/config.toml` | The global config |
| `~/.pmpx/` | Installed plugins |
| A project's `.pmpx.toml` | Only when you ask — `pmpx plugin set` |

### Why is there no cache file in my project?

::: tip Not worth a dirty working tree
Because a cache would save under a millisecond and cost you a dirty working tree. Every `pmpx`
invocation re-reads the handful of names it needs.
:::

### Does it read `~/.npmrc` or my registry configuration?

**No — not even to read them.**

::: warning No proxy, mirror or registry feature of any kind
Configure those in your shell or in each tool's own config; `pmpx` inherits the environment as-is
when it spawns.
:::

Never touched, on purpose:

```text
~/.cargo/config.toml   ~/.npmrc   ~/.yarnrc   ~/.yarnrc.yml   ~/.bunfig.toml
~/.config/pip/*        ~/.gemrc   src/**     *.lock
```

Note the last two: `pmpx` does not edit your sources, and it does not edit your lockfiles — only
the underlying tool does that, exactly as it would if you had called it directly.

### Does it check for updates automatically?

No. No background check, no startup banner. `pmpx self update --check` asks when you want to know.

### How do I uninstall it?

One binary, one plugin directory, one config directory — plus `cargo uninstall pmpx` if cargo
manages it. [Installation](/guide/installation#uninstalling) has the commands.

## Contributing

### Where do I report a bug?

<https://github.com/pmpx-rs/pmpx/issues>

Include the output of `pmpx info` — it contains the walk, the config files, the scores and the
plugin build information in one block.

### How is the workspace laid out?

| Path | What |
| --- | --- |
| `crates/pmpx/` | The host binary |
| `crates/pmpx-plugin/` | The plugin contract: trait, C ABI shell, `export!` |
| `crates/pmpx-plugin-abi/` | The raw `#[repr(C)]` surface |
| `crates/pmpx-detect/` | The decision, computed from data |
| `crates/pmpx-engine/` | Resolve, spawn, wait, report exit codes |
| `crates/pmpx-loader/` | The host side of `dlopen` |
| `crates/pmpx-project/` | Config reading, merging and writing |

Each backend lives in its own repository and is published separately.

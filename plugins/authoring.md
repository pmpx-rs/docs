# Building a Plugin

A plugin is a Rust crate that answers one question: **given a verb and its arguments, what should
be run?** Everything else — detection, process spawning, exit codes, output — belongs to the host.

## Build a plugin

### Start from the template

```console
$ git clone https://github.com/pmpx-rs/pmpx-plugin-starter
$ cd pmpx-plugin-starter
$ pmpx plugin add .
```

The template builds and installs immediately. Its marker names are deliberately ones no real
project has, so it never competes with a real backend while you are working on it.

### A complete plugin

This is the whole thing — one trait, one function:

```rust
use std::ffi::OsString;
use pmpx_plugin::{CommandSpec, Context, Family, PackageManager, PluginError, Verb};

struct CargoPlugin;

impl PackageManager for CargoPlugin {
    fn name(&self) -> &str { "cargo" }
    fn family(&self) -> Family { Family::RUST }

    fn command(&self, ctx: &Context, verb: Verb, args: &[OsString])
        -> Result<CommandSpec, PluginError>
    {
        match verb {
            Verb::Install if args.is_empty() => Ok(CommandSpec::new("cargo").arg("fetch")),
            Verb::Install => Ok(CommandSpec::new("cargo").arg("add").args(args.iter())),
            Verb::Remove  => Ok(CommandSpec::new("cargo").arg("remove").args(args.iter())),
            Verb::Update  => Ok(CommandSpec::new("cargo").arg("update").args(args.iter())),
            Verb::Run     => Ok(CommandSpec::new("cargo").arg("run").args(args.iter())),
            Verb::Build   => Ok(CommandSpec::new("cargo").arg("build").args(args.iter())),
            Verb::Test    => Ok(CommandSpec::new("cargo").arg("test").args(args.iter())),
            // Say so rather than guessing — the host degrades `exec` for you
            Verb::Exec => Err(PluginError::unsupported_verb(verb)),
        }
    }
}

/// The factory the generated wrapper calls.
pub fn create() -> Box<dyn PackageManager> { Box::new(CargoPlugin) }
```

### The manifest

`pmpx-plugin.toml` sits next to the crate's `Cargo.toml`. It is read **without loading any code**,
which is what makes `plugin ls` and detection safe to run in any repository.

```toml
[plugin]
name = "cargo" # must equal `PackageManager::name()`
version = "0.3.0" # must equal Cargo.toml's version
abi = 3 # PMPX_ABI_MAJOR
family = "rust"

[detect]
strong = [ "Cargo.lock" ] # 100 points: this backend actually resolved the project
weak = [ "Cargo.toml" ] # 10 points: this only proves the ecosystem

[context]
files = [ "Cargo.toml" ] # contents this plugin is allowed to read
```

Getting `strong` and `weak` right is the single most consequential decision in a plugin. The
[detection guide](/guide/detection) explains the two tiers; the short version is that a lockfile
goes in `strong` and a manifest goes in `weak`.

::: tip Why the name is checked twice
The host refuses to load a library whose reported name disagrees with the manifest. That is what
catches a plugin directory assembled out of mismatched pieces — a stale library next to a new
manifest — instead of running one backend's code under another's identity.
:::

## The rule `command()` obeys

### `command()` is a pure mapping

This is the rule the whole architecture rests on. `command()` may **not**:

- read files
- write files
- read the environment
- run processes
- make network requests

It receives the verb, the arguments and what the host already knows, and returns a command. That
purity is what makes a plugin testable with `cargo test`, what makes `--debug` a non-input, and
what makes the ABI boundary small enough to be auditable.

### When a name is not enough

Real package managers decide things based on file *contents*, and Yarn is the classic case: classic
and Berry spell `update` differently, and the only evidence is a file.

The plugin declares what it wants to read, in its own manifest:

```toml
[context]
files = [
  "package.json",
  ".yarnrc.yml"
]
```

and then reads exactly that:

```rust
// The plugin parses it; pmpx never learns what is inside.
if ctx.file_str("package.json").is_some_and(|s| s.contains("\"packageManager\"")) { ... }
```

**The host reads the bytes and hands them over without interpreting them.** Undeclared names are
never readable, so the boundary stays explicit: a plugin can only see what it said it needed.

### The other half of the same idea

Sometimes a *filename* is the answer, and the content is not needed at all. The host reports which
markers matched, and the plugin reads that instead of probing:

```rust
// Yarn classic and Berry spell this one verb differently, and the only evidence is a file.
Verb::Update if ctx.has_matched(".yarnrc.yml") => Ok(CommandSpec::new("yarn").arg("up")),
Verb::Update => Ok(CommandSpec::new("yarn").arg("upgrade")),
```

This is why shape decisions go through `Context::matched` rather than the filesystem.

## Context and logging

### What `Context` carries

| Field / method | What it tells you |
| --- | --- |
| `project_root` | The directory the project was detected at |
| `start_dir` | **Where the person ran `pmpx`** — the only way to tell which package of a monorepo this is, and *not* where the command will run |
| `matched` / `has_matched(name)` | Which detection markers hit |
| `reason` and `score` | Why this plugin was picked, and with what score |
| `pins` / `was_pinned()` / `pinned_for(family)` | The project's pins, as they were read |
| `config_files` | The project config files that were collected |
| `file(name)` / `file_str(name)` | The declared `[context] files`, as bytes or as text |

`start_dir` versus `project_root` is the distinction that bites. In a monorepo both are real, and
they are different: `project_root` is where the lockfile is, `start_dir` is the package you are
standing in.

### Logging

A plugin explains itself **through the host**, so its output cannot corrupt a `--json` stream:

```rust
pmpx_plugin::debug!("resolved via berry");
pmpx_plugin::info!("using the workspace root");
pmpx_plugin::warn!("no lockfile; assuming the default");
pmpx_plugin::error!("could not map this verb");
```

The host adds the plugin's id and decides what to print:

```text
pmpx debug: [pnpm] context: root=… start=… matched=[package.json pnpm-lock.yaml] verb=install …
```

`debug::context()` prints the whole context on one line, which is usually the fastest way to find
out why a plugin saw something unexpected.

That switch lives on the **host** side, which is what keeps `--debug` from being an input a plugin
could branch on: a debug run executes byte-for-byte the same command as any other. With no host —
a plugin's own `cargo test` — the macros fall back to stderr, so you still see them.

## The ABI and panics

### The ABI, and why you never see it

A plugin crate is a **plain rlib**: no `#[no_mangle]`, no `crate-type`.

```toml
# Cargo.toml
[lib]
# Nothing special. It is an ordinary library.
```

::: details Why a plugin author never sees the ABI
When `pmpx` installs (or packs) a plugin, it generates a few-line wrapper that calls
`pmpx_plugin::export!(create)` and builds **that** into the cdylib. The whole C ABI shim —
`catch_unwind`, string lifetimes, the capability tables — is generated, so a plugin author never
sees any of it.

The rlib shape is also what makes `cargo test` work on the plugin directly, with no host, no
`dlopen` and no fixture.
:::

::: warning `export!` goes in the wrapper, not the plugin
Writing it in both places defines `pmpx_plugin_entry_v3` twice, and the link fails. The plugin
crate's only obligation is `pub fn create() -> Box<dyn PackageManager>`.
:::

### Panics

| Where a panic happens | What the host sees |
| --- | --- |
| inside `command` | `PMPX_ERR_INTERNAL` → `pmpx` exits `1` |
| inside `name` or `family` | the `PANIC_MARKER` sentinel |

Panics are caught at the boundary because unwinding across `extern "C"` is undefined behaviour.
The trait is synchronous: no `async`, no callbacks, no runtime.

## Testing and the checklist

### Testing

```console
$ cargo test -p pmpx-plugin            # the contract crate
$ cargo test                            # your plugin, in-process
```

`Context::builder()` builds a context by hand, so a plugin's own tests can construct exactly the
situation they are about — a matched file, a pin, a particular `start_dir` — without a project
directory or a `dlopen`.

The workspace also has the reference material:

| Path | What |
| --- | --- |
| `pmpx-plugin-starter` | The template to copy |
| `pmpx-plugin/src/context.rs` | Every `Context` field, documented |
| `crates/pmpx-plugin/tests/` | A real `dlopen` end-to-end, plus in-process tests |
| `crates/pmpx-plugin/tests/fixtures/toy-plugin` | A minimal plugin built as a real cdylib |

### Checklist

- [ ] `name` in the manifest equals `PackageManager::name()`
- [ ] `version` in the manifest equals `Cargo.toml`'s
- [ ] `abi` equals the `pmpx-plugin` dependency's `PMPX_ABI_MAJOR`
- [ ] A real lockfile is in `detect.strong`, a manifest in `detect.weak`
- [ ] Every file the plugin reads is declared in `[context] files`
- [ ] `command()` touches nothing but its arguments
- [ ] Verbs the backend cannot express return `PluginError::unsupported_verb`

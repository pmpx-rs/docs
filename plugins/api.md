# Plugin API Overview

The contract crate is [`pmpx-plugin`](https://crates.io/crates/pmpx-plugin): **zero dependencies**,
MSRV 1.82. This page is a map of what it exposes.

## The trait and its types

### `PackageManager`

The one trait a plugin implements.

```rust
pub trait PackageManager {
    fn name(&self) -> &str;
    fn family(&self) -> Family;
    fn command(&self, ctx: &Context, verb: Verb, args: &[OsString])
        -> Result<CommandSpec, PluginError>;
}
```

| Method | Contract |
| --- | --- |
| `name` | Must equal the manifest's `plugin.name`. The host refuses the load otherwise. |
| `family` | Which ecosystem this backend belongs to. Also what `.pmpx.toml` pins are keyed by. |
| `command` | A pure mapping. No files, no environment, no processes. |

::: warning `command()` is a pure mapping
Every call is answered from the verb, the arguments and the `Context` it was handed — no files, no
environment, no processes.
:::

Neither `name` nor `family` may touch the filesystem: they are called before a decision exists,
and a dashboard like `plugin ls` may call them for a plugin that will never run.

### `Verb`

A closed set of seven. Closed on purpose — a verb the host cannot express is a verb no plugin can
be asked for.

```rust
pub enum Verb { Install, Remove, Update, Run, Build, Test, Exec }
```

| Associated item | Use |
| --- | --- |
| `Verb::ALL` | Every variant, for tests and for asking a plugin what it supports |
| `Verb::to_abi` / `Verb::from_abi` | The wire numbers, i.e. `PMPX_VERB_*` |
| `Verb::as_str` | The CLI spelling: `"install"`, `"run"`, … |

### `CommandSpec`

What a plugin returns: a program, its arguments, and optionally where to run it.

```rust
pub struct CommandSpec {
    pub program: OsString,
    pub args: Vec<OsString>,
    pub cwd: Option<PathBuf>,
}

impl CommandSpec {
    pub fn new(program: impl Into<OsString>) -> Self;
    pub fn arg(self, arg: impl Into<OsString>) -> Self;
    pub fn args<I>(self, args: I) -> Self where I: IntoIterator<Item = impl Into<OsString>>;
    pub fn cwd(self, dir: impl Into<PathBuf>) -> Self;
}
```

`cwd: None` means the project root. Set it when a backend has to run somewhere specific — a
workspace member, a package directory.

The builder methods take `self` by value and return `Self`, so a spec reads left to right:

```rust
CommandSpec::new("cargo").arg("add").args(args.iter())
```

### `Context`

Everything the host knows about this call. Read-only, and valid only for the duration of the call
it arrived with.

```rust
pub struct Context<'a> { /* … */ }

impl<'a> Context<'a> {
    pub fn has_matched(&self, name: &str) -> bool;
    pub fn was_pinned(&self) -> bool;
    pub fn pinned_for(&self, family: impl AsRef<str>) -> Option<&str>;
    pub fn file(&self, name: &str) -> Option<&[u8]>;
    pub fn file_str(&self, name: &str) -> Option<&str>;
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `project_root` | `&Path` | Where the project was detected |
| `start_dir` | `&Path` | Where the person ran `pmpx` — not where the command will run |
| `matched` | detection hits | Which markers made this plugin win |
| `config_files` | `&[PathBuf]` | The `.pmpx.toml` layers that were read |
| `pins` | `&Pins` | The project's pins, family → plugin |
| `reason` | `Reason` | Why this plugin was selected |
| `score` | numeric | The score that selected it |

`file()` and `file_str()` answer only for names declared in the plugin's own `[context] files`. An
undeclared name returns `None` — the host does not go looking.

`Context::builder()` constructs one by hand, which is how a plugin's own unit tests describe the
situation they care about without a real project directory.

### `Family`

An **open type**, not a closed enum: known ecosystems have constants and unknown ones extend via
`Family::new`.

```rust
impl Family {
    pub const NODE:   Family;
    pub const RUST:   Family;
    pub const PYTHON: Family;
    pub const GO:     Family;
    pub const JVM:    Family;
    pub const DOTNET: Family;
    pub const PHP:    Family;
    pub const RUBY:   Family;

    pub fn new(name: impl Into<Cow<'static, str>>) -> Self;
    pub fn as_str(&self) -> &str;
}
```

Comparison and ordering are by string. A third-party plugin supporting a new ecosystem needs
neither a change to the contract crate nor a `pmpx` release — which is the whole reason this is not
an enum.

### `PluginError`

```rust
pub enum PluginError { UnsupportedVerb, InvalidArgs, Other(..) }
```

| Constructor | Use it when |
| --- | --- |
| `PluginError::unsupported_verb(verb)` | The backend has no answer for this verb. **Prefer this over guessing.** |
| `PluginError::invalid_args(..)` | The arguments cannot mean anything to this backend |
| `PluginError::other(..)` | Anything else, with a message for a person |

::: tip No answer is an answer
`unsupported_verb` is not a failure — it is information. It is what lets `pmpx exec` fall back to
running the command itself, and what makes `pmpx build` exit `2` with an explanation instead of
running something plausible and wrong.
:::

## Logging, the wrapper and the raw ABI

### Logging macros

```rust
pmpx_plugin::debug!("…");
pmpx_plugin::info!("…");
pmpx_plugin::warn!("…");
pmpx_plugin::error!("…");
```

They reach the host, which adds the plugin's id and decides what to print — so `--json` stays
parseable no matter what a plugin logs. With no host (a plugin's own `cargo test`), they fall back
to stderr.

| Module item | Use |
| --- | --- |
| `debug::Level` | The four levels |
| `debug::wants(level)` | Whether anything would be printed — skip expensive formatting |
| `debug::emit(..)` | The macros' implementation, for a custom path |
| `debug::context()` | Prints the whole context as one line |

### `export!` and the shell

```rust
pmpx_plugin::export!(create);
```

Written **once**, in the generated wrapper crate — not in the plugin crate. The wrapper is what
becomes the cdylib; the plugin stays a plain rlib that `cargo test` can exercise directly.

| Item | Role |
| --- | --- |
| `export!` | Generates the entry symbol and the capability tables |
| `shell` | The ABI shim: string lifetimes, `catch_unwind`, capability negotiation |
| `abi` | The wire format, re-exported from `pmpx-plugin-abi` |
| `dispatch`, `guard` | The plugin-side helpers the shim calls |
| `PANIC_MARKER`, `BUILD_RUSTC`, `BUILD_TARGET` | Sentinels and build metadata reported to the host |

### `pmpx-plugin-abi`

The raw C ABI, underneath the safe layer — `#[repr(C)]` tables and plain numbers, `no_std` and
zero dependencies, deliberately translatable by hand so a plugin can be written in C, Zig or Go.

You do not need it to write a Rust plugin. It is documented here because it defines what
"compatible" means at the boundary:

| Item | Meaning |
| --- | --- |
| `PMPX_ABI_MAJOR` | The version gate, currently `3` |
| `PMPX_ENTRY_SYMBOL` | The symbol the host looks for |
| `PMPX_MAX_ITEMS` | The ceiling on any table and any argument list |
| `PMPX_OK`, `PMPX_ERR_*`, `PMPX_VERB_*`, `PMPX_REASON_*`, `PMPX_LEVEL_*` | The numbers |
| `PMPX_KEY_*`, `PMPX_CAP_*`, `PMPX_KEYS`, `PMPX_CAPS`, `PMPX_REQUIRED_CAPS` | Context keys and capability names |

::: details Absent versus empty, and panics at the boundary
Two rules from that layer shape everything above it:

- **Absent and empty are different.** A null pointer means the host has nothing under that key;
  a non-null pointer with length zero is an empty value.
- **Unknown is not an error, in either direction.** The host answers `absent` for a key it does not
  know; a plugin must answer `PMPX_ERR_UNSUPPORTED_VERB` for a verb it does not recognise.

Memory is freed by whoever allocated it, borrowed views live only for the call they arrived with,
and a panic must never cross `extern "C"`.
:::

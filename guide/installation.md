# Installation

## With cargo

```bash
cargo install pmpx
```

The binary is named `pmpx`. This is the only method that works on every platform Rust supports,
because it builds from source.

## Prebuilt archives

Every release attaches archives for Linux and Windows on `x86_64` and for both macOS
architectures. The install scripts download the one for this machine, verify it against the
release's `SHA256SUMS`, and install it.

::: code-group

```bash [Linux / macOS]
curl -LsSf https://pmpx.dev/install.sh | sh
```

```powershell [Windows]
irm https://pmpx.dev/install.ps1 | iex
```

```bash [cargo-binstall]
cargo binstall pmpx
```

:::

### Where it lands

The scripts write **one file** and leave `PATH` and your shell profiles alone.

| Platform | Directory |
| --- | --- |
| Linux / macOS | `~/.local/bin` |
| Windows | `%USERPROFILE%\.pmpx\bin` |

::: warning `pmpx: command not found`
None of the scripts edit your shell profile, so that directory has to be on your `PATH` — or you
have to call the binary by its full path. This is the most common way a successful install looks
like a failed one.
:::

### Mirror and pinning

All three scripts read these from the environment:

| Variable | Effect |
| --- | --- |
| `PMPX_INSTALL_DIR` | Install somewhere else |
| `PMPX_VERSION` | Install a specific version instead of the newest |
| `PMPX_BASE_URL` | Download from a mirror instead of `github.com` |

A platform with no prebuilt archive is not a failure — `cargo install pmpx` builds from source
anywhere Rust does.

## Verify the install

```console
$ pmpx --version
pmpx {{pmpx.version}}
```

Then check what it can see. With no plugins installed yet, this is the expected answer:

```console
$ pmpx info
Start         /home/you/code/some-repo
Project root  /home/you/code/some-repo
Walk-up       1 directory, stopped because: .git
Project config  (none)

Installed plugins  (none)

No plugin is installed, so pmpx cannot detect a project. Install one with
`pmpx plugin add <name>`.
```

::: tip That message is expected
It is the *"at least one plugin"* requirement showing itself, not a broken install. The next page
fixes it.
:::

## Requirements

| | |
| --- | --- |
| To build from source | Rust **1.88+** |
| To run | At least one plugin — see [Plugins & the Store](/reference/plugins) |
| To write a plugin | Rust **1.82+** for the contract crate |

## Updating

```console
$ pmpx self update --check         # what is available; changes nothing
$ pmpx self update                 # replace this binary with the newest release
$ pmpx self update --version 0.1.0 # or a specific one, which is also how you roll back
```

Nothing is ever checked automatically: no background check, no *"a new version is available"*
banner on startup.

### When it refuses

Only installations that cargo does not manage can replace themselves — `cargo install` keeps its
own record of what it put on disk, so `pmpx` tells you to run `cargo install pmpx --force`
instead.

::: details What the checksum proves, and what it does not
The download is verified against the release's `SHA256SUMS` before anything is replaced, and a
mismatch stops there and leaves the running binary alone.

That is **not a signature**. The checksum file and the archive come from the same place, so it
proves the bytes arrived intact — not who built them. Treat it as protection against a truncated
download or a corrupted mirror, not against a compromised release.

The remaining rules — which flags combine, and how a running binary is replaced on Windows — are
in [Self Update](/reference/self-update).
:::

## Uninstalling

There is no `pmpx uninstall`, because there is nothing to unwind: one binary, one plugin
directory, one config directory.

```bash
# Linux / macOS
rm "$(command -v pmpx)"
rm -rf ~/.pmpx ~/.config/pmpx

# Windows
Remove-Item "$env:USERPROFILE\.pmpx" -Recurse -Force
Remove-Item "$env:APPDATA\pmpx" -Recurse -Force
```

If you installed with cargo, use `cargo uninstall pmpx` instead of deleting the file, so cargo's
record stays correct.

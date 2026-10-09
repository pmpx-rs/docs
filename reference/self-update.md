# Self Update

```console
$ pmpx self update --check         # what is available; changes nothing
$ pmpx self update                 # replace this binary with the newest release
$ pmpx self update --version 0.1.0 # or a specific one, which is also how you roll back
$ pmpx self update --force         # reinstall even when this version is the one running
```

Nothing is ever checked automatically. There is no background check and no *"a new version is
available"* banner on startup — an update happens when you ask for one.

## Only installations cargo does not manage

### The record decides, not the directory

`cargo install` keeps its own record of what it put on disk. Replacing the file behind cargo's back
would make `cargo install --list` disagree with reality, so a `pmpx` installed that way is told to
use cargo instead:

```console
$ pmpx self update
pmpx: this binary is managed by cargo. Run `cargo install pmpx --force` instead.
```

::: warning A cargo-managed binary cannot update itself
The record is what makes `pmpx self update` refuse; run `cargo install pmpx --force` instead.
:::

A `cargo binstall`, a hand-unpacked archive and a `cargo install` all end up in the same place;
only the first two update themselves.

## What the checksum proves

::: details What the checksum proves, and what it does not
The download is verified against the release's `SHA256SUMS` **before anything is replaced**. A
mismatch stops there and leaves the running binary alone.

That is **not a signature**. The checksum file and the archive come from the same place, so it
proves the bytes arrived intact — not who built them. Treat it as protection against a truncated
download or a corrupted mirror, not against a compromised release.
:::

## Rolling back

### `--version` is the rollback command

`--version` does not mean "downgrade"; it means "install this one". That makes it the rollback
command:

```console
$ pmpx self update --version 0.6.2
```

## Combining flags

`--check` answers a question, so it combines with neither of the others:

| Combination | Allowed | Why |
| --- | --- | --- |
| `--check` alone | ✅ | *"what is available?"* |
| `--check --version 0.1.0` | ❌ | `--version` already names the release to look at |
| `--check --force` | ❌ | `--force` asks to reinstall; `--check` changes nothing |
| `--version` + `--force` | ✅ | Reinstall that specific version |

## Replacing a running binary

On Windows an executable cannot delete itself while it is running. The update writes the new binary
to a `.new` file, swaps it into place as far as the platform allows, and leaves a `.old` behind.

That leftover is cleaned up on the **next** start rather than the current one, silently, because a
failure to delete it only means *"next time"*.

## Environment overrides

The release download honours the mirror variables from the [install scripts](/guide/installation):

| Variable | Effect |
| --- | --- |
| `PMPX_BASE_URL` | Fetch releases from a mirror |
| `PMPX_VERSION` | The version to install, equivalent to `--version` |

## When it does not work

| Symptom | Cause |
| --- | --- |
| *"managed by cargo"* | The install record says so; use `cargo install pmpx --force` |
| Checksum mismatch | A truncated download or a mirror serving something else. Nothing was replaced. |
| No archive for this platform | Build instead: `cargo install pmpx` |
| `403` from GitHub | Rate limiting, common on shared CI runners |

# Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | `pmpx` itself failed, **or the plugin panicked** |
| `2` | Usage error, or the backend does not support that verb |
| `3` | No project detected, no plugin for it, or the tool is not on `PATH` |
| **N** | **The backend's own exit code, passed through** |

The last row is the point. `pmpx test` **has to fail when the tests fail**, so the backend's exit
status is returned as the process's status rather than being wrapped in a pmpx error. A `cargo
test` that exits `101` makes `pmpx test` exit `101`.

```console
$ pmpx test
...
$ echo $?
101
```

That property is what makes `pmpx` safe to drop into an existing CI script: replacing `cargo test`
with `pmpx test` does not change when the job goes red.

## The four of pmpx's own

### `0` — success

Includes the cases where nothing was run: `pmpx`, `pmpx info`, `pmpx --explain <verb>` and the
`plugin` / `config` / `completion` commands all succeed by reporting.

### `1` — pmpx failed, or a plugin panicked

`pmpx`'s own internal failure, and the catch-all for a plugin that panicked. A panic inside a
plugin's `command` is turned into `PMPX_ERR_INTERNAL` rather than being allowed to cross the
`extern "C"` boundary — unwinding across that line is undefined behaviour, so it is caught.

If you see `1` from a plugin, the plugin has a bug; `--debug` is the place to start.

### `2` — usage error, or the verb is unsupported

Two different situations share the code, because they have the same fix: **you asked for something
that is not on offer.**

```console
$ pmpx                              # fine — reports the detection
$ pmpx build extra-arg              # usage error: build takes no positional argument
$ pmpx remove                       # usage error: remove needs a package name
$ pmpx plugin set                   # usage error: set needs a name
$ pmpx --json plugin ls             # this command has no JSON form
$ pmpx build                        # 2, if the backend has no answer for "build"
```

The last one is the one to know about. A backend that cannot express a verb says so, and `pmpx`
reports it as `2` rather than guessing at a reasonable-looking command.

### `3` — nothing to run

Three distinct causes, one code, because from a script's point of view they are the same answer:
*there is nothing here for me to do.*

| Cause | How to tell |
| --- | --- |
| No project detected | `pmpx` prints its error; `pmpx info` shows every score as 0 or absent |
| No plugin for the detected family | `pmpx plugin ls` is missing that family |
| The tool is not on `PATH` | The error names the program that could not be found |

```console
$ cd /tmp && pmpx build
$ echo $?
3
```

This is why bare `pmpx` works as a test:

```bash
if pmpx -q >/dev/null 2>&1; then
  echo "a pmpx project"
fi
```

## Signals and unusual codes

::: details How a signal or an oversized code is reported
| Situation | Result |
| --- | --- |
| Backend killed by a signal | The platform's convention — on Unix, `128 + signal` |
| Backend exits with a code that does not fit 8 bits | Truncated to the low 8 bits, with a `warning` event |
| Backend exits `0` but printed errors | `0`. `pmpx` reports what happened; it does not second-guess it |

The truncation case is worth knowing because it is visible in `--json`:

```console
$ pmpx --json test 2>/dev/null | grep warning
{"event":"warning","text":"exit code 256 does not fit in 8 bits; using 0"}
```
:::

## Using it in CI

```bash
set -e
pmpx install
pmpx build
pmpx test -- --nocapture
```

No wrapper, no `|| true`, no exit-code translation. `set -e` behaves the way it would with the
underlying tools called directly, which is the entire reason the codes are passed through rather
than normalised.

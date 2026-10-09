# JSON Output

`--json` turns a run into a stream a program can read.

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

## The contract

| Stream | Carries |
| --- | --- |
| **stdout** | one JSON object per line, and nothing else |
| **stderr** | the `pmpx → …` announcement, notes, warnings, and **the backend's own output** |

That second row is the whole design. Under `--json` the backend writes to **stderr** instead of
stdout, so stdout is parseable with no filtering.

::: tip Without the flag, nothing changes
Output stays live, colours stay, and `pmpx build > log` means what it has always meant. `--json`
is a mode you opt into, not a new default.
:::

JSONL rather than one array, because a script wants each event as it arrives (a build takes
minutes) and `jq` reads it line by line either way.

## Events

Almost every script needs two of these: `starting` (what is about to run) and `finished` (how it
went). The rest carry detail you reach for when something needs explaining.

### `starting` and `finished`

<!-- Labelled `text`, not `json`: this is JSONL, and two independent objects on two lines are not
     one JSON document. A tool that parses the fence as JSON would reject the format the page is
     explaining. -->

```text
{"event":"starting","program":"cargo","args":["test","--nocapture"],"cwd":"/home/you/code/my-crate"}
{"event":"finished","code":101}
```

`cwd` is where the command runs, which is not necessarily where you invoked `pmpx` — inside a
plugin's answer it may be the project root instead.

::: details Every event, and the fields on it
| `event` | Fields | When |
| --- | --- | --- |
| `resolved` | `program`, `path`, `kind` | The backend's real executable was located |
| `starting` | `program`, `args`, `cwd` | The process is about to start |
| `finished` | `code` | It exited |
| `phase` | `name`, `micros`, `detail` | The engine's own timing, per phase |
| `warning` | `text` | Something got clamped or guessed |
| `note` | `text` | A hint |
| `error` | `text` | pmpx's own failure |
| `notes` | `plugin`, `notes` | Notes the plugin attached to its answer |
| `plugin` | `plugin`, `level`, `text` | A plugin's own `debug!` / `info!` / `warn!` / `error!` |

### `resolved`

```json
{ "event": "resolved", "program": "cargo", "path": "/home/you/.cargo/bin/cargo", "kind": "native" }
```

`kind` is how the program will be started:

| `kind` | Meaning |
| --- | --- |
| `native` | a real executable |
| `cmd` | a Windows `.cmd` shim, which needs `cmd.exe` |
| `powershell` | a Windows `.ps1` shim |

The `path` is the resolved one, not the name you typed. On Windows `Command::new("pnpm")` fails
outright, because `CreateProcessW` does no `PATHEXT` resolution and pnpm installs as `pnpm.cmd` —
so this event is the one that explains why something ran, or did not.

### `phase`

```json
{ "event": "phase", "name": "detect", "micros": 82, "detail": "3 plugins scored" }
```

The engine measures itself, so the time a run took can be attributed instead of guessed at. Your
backend is the interesting part in most runs; these are how you find out what the rest was.
:::

## Exit codes are unchanged

`--json` does not change the exit code. A failing test is still `101`, and a stream that ends with

```json
{ "event": "finished", "code": 101 }
```

also exits `101`.

## Which commands accept it

Only the ones that run something: `install`, `remove`, `run`, `build`, `test`, `update`, `exec`.

A command whose result is a **table** refuses the flag and exits `2`:

```console
$ pmpx --json plugin ls
pmpx: `--json` is not supported by this command yet
$ echo $?
2
```

::: warning Refusing is the point
Mixing prose into a stream a caller is parsing would produce a parse error in their code, at a
place with no obvious connection to `pmpx`.
:::

## Worked examples

### Fail the build step on a non-zero backend exit

```bash
pmpx --json test > events.jsonl || exit $?
```

The exit code already comes from the backend, so the shell's `||` behaves normally.

### Report which real tool ran

```bash
pmpx --json build | jq -r 'select(.event == "resolved") | .path'
```

### Time the phases of a run

```bash
pmpx --json --debug build \
  | jq -r 'select(.event == "phase") | "\(.micros / 1000 | round)ms\t\(.name)"'
```

### Watch a long run without losing the output

```bash
pmpx --json install > events.jsonl
```

stdout is the event stream; the human-readable install log is on stderr and still visible in the
terminal, or redirectable on its own with `2>install.log`.

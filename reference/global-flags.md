# Global Flags

Every flag here is global: it may appear before or after the subcommand, and it applies to the
whole run.

| Flag | Meaning |
| --- | --- |
| `-p, --plugin <NAME>` | Use this plugin, **overriding `.pmpx.toml`** |
| `-C, --dir <PATH>` | Operate in this directory (same as `cd`-ing there first) |
| `--no-walk-up` | Only look at the current directory; do not walk up to the project root |
| `-q, --quiet` | Suppress hints and the resolved command on stderr |
| `--debug` | Print debug information for this run |
| `--json` | Print the run as JSON on stdout, one object per line |
| `--explain` | Report how the backend was chosen, and run nothing |

## Flag details

### `-p, --plugin <NAME>`

A one-off override, not written to disk. To make it permanent, use `pmpx plugin set`.

```console
$ pmpx -p cargo build
```

::: tip The only thing that outranks evidence
A pin in `.pmpx.toml` gives its family a floor of 50; `-p` skips the decision entirely. That is
deliberate: a flag you typed is unambiguous and leaves nothing behind, so it can afford to be
blunt.
:::

### `-C, --dir <PATH>`

Runs as if you had `cd`-ed there first, but the shell's own working directory is left alone. Useful
in scripts and in editors, where changing the process's directory is either impossible or rude.

```console
$ pmpx -C ../other-repo test
$ pmpx -C /abs/path/to/repo
```

### `--no-walk-up`

Restricts the search to the directory you are in. The counterpart is the global config's
`[discovery] walk_up`, which is a persisted version of the same switch.

```console
$ pmpx --no-walk-up info
```

This is the flag for *"I know this subdirectory is its own project and the parent's `package.json`
is not mine"* — the case where walking up finds a real project that is nevertheless the wrong one.

### `-q, --quiet`

Suppresses the hints and the resolved command on **stderr**. The backend's own output is
untouched, so `pmpx -q build > log` still means what it looks like.

Ambiguous detection, uninstalled candidates and the `pmpx → cargo build` announcement are the
things it silences — the narration, not the result.

### `--debug`

One line per phase, to stderr. `--quiet` does not turn it off, because asking for both is a
question worth answering.

The phase switch lives on the host side, which is what keeps `--debug` from being an input a
plugin could branch on: **a debug run executes byte-for-byte the same command as any other run.**

```console
$ pmpx --debug build
```

### `--json`

Turns a run into a stream a program can read. See [JSON Output](/reference/json) for the event
schema. In one line: stdout is JSONL, everything meant for a human goes to stderr.

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

::: warning Not every command has a JSON form
Only the commands that *run* something have one. A command whose result is a table — say
`pmpx plugin ls` — refuses the flag and exits `2`, rather than quietly mixing prose into the
stream a caller is parsing.
:::

### `--explain`

Answers *"how was this decided?"* and runs nothing. It is resolved before anything is loaded or
spawned, so it costs what it looks like it costs.

```console
$ pmpx --explain build
```

It reports the markers that matched, the pins that applied, the scores, and the winner — including
any tie, which is the signal that a repository is one commit away from being ambiguous.

See [Resolving a Backend](/guide/resolution) for how to read the output.

## Combining them

| Goal | Command |
| --- | --- |
| Force a backend for one command | `pmpx -p cargo test` |
| Run in another repository | `pmpx -C ../repo install` |
| Treat this directory as the whole project | `pmpx --no-walk-up info` |
| Silence the hints, keep the result | `pmpx -q build > log` |
| Read the run as a stream | `pmpx --json build` |
| Silent, parseable run | `pmpx -q --json test \| jq` |
| Find out why the wrong thing was picked | `pmpx --explain build` |
| Attribute the time a run took | `pmpx --debug build` |

# Resolving a Backend

Detection scores every installed plugin. Resolution turns those scores into one answer, in three
steps: pick a family, pick a plugin inside it, then report.

## Pick a family

Families are ordered by an array you own:

```toml
# <config-dir>/pmpx/config.toml
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
```

### The highest score wins; the array breaks ties

The highest-scoring family wins outright. The array only decides **ties**.

This is where the often-repeated *"mixed projects default to Node"* comes from — and it is not a
rule anywhere in the code. It is `node` being first in the default `family_priority`. Move `rust`
to the front and the same mixed repository goes to `cargo`:

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

### `Family` is an open type

`Family` is an **open type**, not a closed enum. A third-party plugin supporting an ecosystem
`pmpx` has never heard of extends the list by using its name; neither the contract crate nor the
host needs a release for that.

## Pick a plugin inside the family

Same mechanism, one level down:

```toml
[plugin]
priority = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
  "cargo"
]
```

### `priority` decides plugin ties

This resolves ties between plugins in one family — which is the common case, since every Node
backend claims `package.json`. With nothing but a `package.json` in the tree, all four score 10
and `pnpm` wins because it is first.

### The array is global, the pins are per project

The array is global, but pins are per project, so the two compose: a repository can pin `yarn`
while your global preference stays `pnpm`.

## Precedence, in full

From strongest to weakest:

| # | Rule | Where it lives |
| --- | --- | --- |
| 1 | `-p, --plugin <name>` | the command line — overrides everything, for one run |
| 2 | Evidence: `strong` (100) and `weak` (10) markers | the project directory |
| 3 | A pin: floor of 50 for its family | the nearest `.pmpx.toml` |
| 4 | `family_priority` | the global config — ties only |
| 5 | `priority` | the global config — ties only |

::: tip `-p` is the only thing that outranks evidence
Rule 1 beating rule 2 is the only place intent outranks evidence. That is deliberate: `-p` is a
flag you type, so it is unambiguous and it leaves nothing behind on disk.
:::

## Pins

```toml
# .pmpx.toml
[plugin]
node = "pnpm" # pin Node to pnpm, and give node a 50-point floor
rust = "cargo"
```

The keys are **family names**, the values are plugin names. Two effects at once:

- a **50-point floor** for that family, so it beats weak evidence;
- a **forced choice inside the family**, so `yarn` wins even if `priority` says `pnpm`.

`pmpx plugin set <name>` writes the nearest `.pmpx.toml`, creating it if necessary. Because the
key is the family the plugin belongs to, `pmpx plugin set yarn` writes `node = "yarn"`.

::: warning A pin is a floor, not an override
The floor is 50 and a `strong` marker is worth 100, so a pin beats `weak` evidence and still loses
to a real lockfile in the directory. To override evidence for one run, use `-p`.
:::

## Project configs stack

`.pmpx.toml` files are collected **upward from the working directory**, and among them the
**nearest wins**:

```text
monorepo/
├── .pmpx.toml            node = "pnpm"        ← furthest, only reached if nothing nearer says
├── package.json
└── packages/
    └── web/
        ├── .pmpx.toml    node = "yarn"        ← nearest: wins for anything under web/
        └── package.json
```

That is what lets a monorepo set a default at the root and override it in a single package.

### See which files were read

`pmpx info` lists every file that was read, in order, so the provenance is never a mystery:

```console
$ pmpx info
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"
```

## Seeing the decision

Three commands, three levels of detail, none of which run the backend:

| Command | Answers |
| --- | --- |
| `pmpx` | what this directory is, and which plugin will run |
| `pmpx --explain <verb>` | what the decision was based on — markers, pins, scores, the winner |
| `pmpx info` | everything: the walk, every config file, every candidate, every score, the loaded plugin's own build info |

```console
$ pmpx --explain build
```

`--explain` is answered before anything is loaded or spawned, so it is exactly as cheap as it
looks. `info` is the only command that loads the winning plugin without running it, because the
diagnostics it prints — the version and target the plugin was compiled with — only exist inside
the loaded library.

## Ties are reported, not hidden

When two candidates score the same, the winner is still returned, and the tie is written into the
selection's notes. `--explain` and `info` both show it:

```console
$ pmpx --explain test
```

Reading the notes is how you find out that your new repository is one `package.json` away from
being ambiguous — before a teammate hits it.

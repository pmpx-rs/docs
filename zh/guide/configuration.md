# 配置

`pmpx` 有两层配置，各司其职。

| 层级 | 文件 | 是否提交到仓库 | 用途 |
| --- | --- | --- | --- |
| 全局 | `<config-dir>/pmpx/config.toml` | 否——它属于你 | 优先级数组、探测限制、商店设置 |
| 项目级 | `.pmpx.toml` | **是**——它属于这个仓库 | 这个项目使用哪个后端 |

没有第三层，也没有缓存文件。除非你主动要求，否则不会往你的项目里写任何东西。

## 全局配置的位置

| 平台 | 路径 |
| --- | --- |
| Linux | `~/.config/pmpx/config.toml` |
| macOS | `~/Library/Application Support/pmpx/config.toml` |
| Windows | `%APPDATA%\pmpx\config\config.toml` |

::: tip Windows 上重复出现的 `config` 是刻意的
`ProjectDirs` 把 `RoamingAppData\<app>\config` 排成这个样子，而且已发布的 `pmpx` 版本读的就是
这个文件。把路径整理干净会悄无声息地搬走每个 Windows 用户的配置，所以它保持不变。
:::

### 环境变量覆盖

有两个环境变量可以直接覆盖这些位置，用于测试和多环境场景：

| 变量 | 替代什么 |
| --- | --- |
| `PMPX_CONFIG_DIR` | 全局配置**目录**（`config.toml` 从其中读取） |
| `PMPX_DATA_DIR` | 插件数据目录 |

## 全局配置全文

文件不存在意味着**全部使用默认值**，而不是报错。文件*损坏*则报错，而不是静默回退到默认值——悄悄
忽略你写的配置，比直接告诉你更糟。

```toml
# <config-dir>/pmpx/config.toml

[plugin]
# Family order. Decides ties between families -- nothing else.
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
# Plugin order inside one family. Decides ties between plugins.
priority = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
  "cargo"
]

[discovery]
# false = only look at the directory you ran pmpx in
walk_up = true
# How many directories may be checked at most, the start included
max_depth = 8
# Do not look above a repository root -- anything up there is a different project
stop_at_git = true

[plugin_store]
# Override the plugin directory. Empty = the default (`~/.pmpx`)
data_dir = "~/.pmpx"
# Download a prebuilt plugin when the release has one, instead of building on this machine
prefer_prebuilt = true
```

每个键都是可选的；每一项单独回退到默认值。

### 两个优先级数组只打破平局

两个数组都不覆盖证据。它们只打破**平局**：

::: details 两个数组的完整默认值

```toml
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
priority = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
  "cargo"
]
```

:::

一个同时有 `package.json` 和 `Cargo.toml`、且没有 lockfile 的仓库，`node` 得 10 分，`rust`
得 10 分。Node 因为排在第一位而胜出。**“混合项目默认走 Node”的全部实现就是这一句**——代码里没有
这样一条规则。把 `rust` 挪到最前面，同一个仓库就会走 `cargo`：

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

完整的优先级表见[后端解析](/zh/guide/resolution)。

## 读取和写入配置

```console
$ pmpx config get plugin.family_priority
$ pmpx config get discovery.max_depth
$ pmpx config set discovery.max_depth 3
```

`config get` 接受**点分路径**，这样不用手改 TOML 就能定位嵌套的键。

### `config set` 只写全局配置

它从不碰项目的 `.pmpx.toml`，因为一个没有项目上下文的命令悄悄改你的仓库会让人意外。值会按照该键
已有的类型来解析，所以 `config set discovery.max_depth 3` 写入的是数字 `3` 而不是字符串 `"3"`，
数组键也仍然是数组。

### 未知的键会被保留

两个配置结构体都会把不认识的内容原样带过去，所以读-改-写——`config set` 或 `plugin set` 所做的
任何操作——不会悄悄删掉来自更新或更旧 `pmpx` 版本的键。

写入是原子的：先在同目录写一个临时文件，再重命名，因此写入被中断也不会留下半个文件。

## 项目配置

`.pmpx.toml` 指定项目使用哪个后端：

```toml
# .pmpx.toml
[plugin]
node = "pnpm" # pin Node to pnpm, and give node a 50-point floor
rust = "cargo"

[scripts]
# A name the project defines for itself, answered before any plugin is involved
fmt = "cargo fmt --all"
lint = { args = [
  "clippy",
  "--all-targets",
  "--",
  "-D",
  "warnings"
] }
```

### 文件层层叠加，最近的胜出

`.pmpx.toml` 会从工作目录**向上**收集，其中**最近的胜出**：

```text
monorepo/
├── .pmpx.toml            node = "pnpm"
├── package.json
└── packages/
    └── web/
        ├── .pmpx.toml    node = "yarn"     ← wins for anything under web/
        └── package.json
```

更近的文件按 key 逐个覆盖更远的文件；它不是整体替换。这正是 monorepo 能在根目录设默认值、并覆盖
某一个包的原因。

`pmpx plugin set <name>` 写入**最近的** `.pmpx.toml`，不存在则创建。它写入的键是插件所属的
**family**，所以 `pmpx plugin set yarn` 写入 `node = "yarn"`。

::: warning 最近的胜出，而不是根目录胜出
根目录的 `.pmpx.toml` 设的是默认值，而更近的文件会按 key 逐个覆盖它。所以在 monorepo 里，你所在
的包可以和你正在看的那份文件说的不一样。
:::

### `[scripts]`

具名脚本由项目自己回答，在任何插件被问之前。它是给人的便利，不是插件翻译的东西：

```toml
[scripts]
fmt = "cargo fmt --all"
lint = { args = [
  "clippy",
  "--all-targets",
  "--",
  "-D",
  "warnings"
] }
```

```console
$ pmpx run fmt -- --check          # → cargo fmt --all --check
$ pmpx run lint                    # → clippy --all-targets -- -D warnings
```

两种写法都可用：**字符串**是一行 shell 风格的命令，**`args` 数组**是程序和它的参数，中间不经过
shell。你在名字后面输入的任何内容都会被追加，这就是 `pmpx run fmt -- --check` 不需要第二套机制
就能工作的原因。

当命令也需要在 Windows 上工作时，优先用 `{ args = [...] }`，因为它从不依赖 shell 会如何切分
字符串。

## 查看读了什么

`pmpx info` 会按顺序打印收集到的每个项目配置文件，以及找到的钉住：

```console
$ pmpx info
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"
```

回答*“它为什么选了这个？”*时，这个列表比得分更常用。

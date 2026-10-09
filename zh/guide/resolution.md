# 后端解析

探测给每个已安装的插件打分。解析把这些得分变成一个答案，分三步：挑一个 family，在它内部挑一个
插件，然后报告。

## 挑一个 family

family 的顺序由一个属于你的数组决定：

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

### 得分最高的胜出，数组只打破平局

得分最高的 family 直接胜出。这个数组只决定**平局**。

那句被反复引用的*“混合项目默认走 Node”*就是这么来的——代码里任何地方都没有这条规则。它只是
`node` 排在默认 `family_priority` 的第一位。把 `rust` 挪到最前面，同一个混合仓库就会走
`cargo`：

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

### `Family` 是开放类型

`Family` 是一个**开放类型**，不是封闭枚举。支持某个 `pmpx` 从未听说过的生态的第三方插件，只要
用它的名字就能扩展这个列表；契约 crate 和宿主都不需要为此发新版本。

## 在 family 内部挑一个插件

同样的机制，下降一层：

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

### `priority` 决定插件之间的平局

它用来解决同一个 family 内插件之间的平局——这是常见情况，因为每个 Node 后端都声明
`package.json`。当目录里只有一个 `package.json` 时，四个都拿 10 分，`pnpm` 因为排在最前面而
胜出。

### 数组是全局的，钉住是每个项目的

这个数组是全局的，而钉住是按项目来的，所以两者可以叠加：某个仓库可以钉住 `yarn`，同时你的全局
偏好仍然是 `pnpm`。

## 完整优先级

从最强到最弱：

| # | 规则 | 存放在哪 |
| --- | --- | --- |
| 1 | `-p, --plugin <name>` | 命令行——覆盖一切，只对一次运行有效 |
| 2 | 证据：`strong`（100）和 `weak`（10）标记 | 项目目录 |
| 3 | 钉住：给它所属 family 的 50 分下限 | 最近的 `.pmpx.toml` |
| 4 | `family_priority` | 全局配置——只决定平局 |
| 5 | `priority` | 全局配置——只决定平局 |

::: tip `-p` 是唯一能压过证据的东西
规则 1 压过规则 2，是唯一让意图优先于证据的地方。这是刻意的：`-p` 是你亲手敲的标志，含义明确，
而且不在磁盘上留下任何东西。
:::

## 钉住

```toml
# .pmpx.toml
[plugin]
node = "pnpm" # pin Node to pnpm, and give node a 50-point floor
rust = "cargo"
```

键是 **family 名**，值是插件名。它同时产生两个效果：

- 给该 family 一个 **50 分的下限**，因此能压过弱证据；
- 在 family 内**强制选定**，因此即使 `priority` 写的是 `pnpm`，`yarn` 也会胜出。

`pmpx plugin set <name>` 会写入最近的 `.pmpx.toml`，必要时创建它。因为键是插件所属的 family，
所以 `pmpx plugin set yarn` 写入的是 `node = "yarn"`。

::: warning 钉住是地板，不是覆盖
地板是 50 分，而一个 `strong` 标记值 100 分，所以钉住能压过 `weak` 证据，但压不过目录里真实存在
的 lockfile。要在一次运行里覆盖证据，用 `-p`。
:::

## 项目配置层层叠加

`.pmpx.toml` 会从工作目录**向上收集**，其中**最近的胜出**：

```text
monorepo/
├── .pmpx.toml            node = "pnpm"        ← furthest, only reached if nothing nearer says
├── package.json
└── packages/
    └── web/
        ├── .pmpx.toml    node = "yarn"        ← nearest: wins for anything under web/
        └── package.json
```

这正是 monorepo 能在根目录设默认值、又在单个包里覆盖它的原因。

### 查看读过哪些文件

`pmpx info` 会按顺序列出读过的每个文件，所以来源从来不是谜团：

```console
$ pmpx info
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"
```

## 查看判定结果

三条命令，三个细节层级，都不会执行后端：

| 命令 | 回答什么 |
| --- | --- |
| `pmpx` | 这个目录是什么，以及哪个插件会运行 |
| `pmpx --explain <verb>` | 判定依据是什么——标记、钉住、得分、胜者 |
| `pmpx info` | 全部内容：查找过程、每个配置文件、每个候选、每个得分，以及已加载插件自身的构建信息 |

```console
$ pmpx --explain build
```

`--explain` 在任何东西被加载或拉起之前就给出答案，所以它的开销就跟看上去一样小。`info` 是唯一
会加载胜出插件但不运行它的命令，因为它打印的诊断信息——插件编译时用的版本和目标平台——只存在于
已加载的库里。

## 平局会被报告，而不是被隐藏

两个候选得分相同时，仍然会返回胜者，同时把这次平局写进选择结果的备注里。`--explain` 和 `info`
都会显示它：

```console
$ pmpx --explain test
```

读这些备注，你就能在同事踩到之前发现：你的新仓库距离产生歧义只差一个 `package.json`。

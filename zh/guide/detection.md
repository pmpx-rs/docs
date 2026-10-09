# pmpx 如何探测项目

探测只回答一个问题：**这个目录归哪个已安装的插件管？**

它做到这一点，靠的是不加载任何一行插件代码。打分读取每个插件在其 manifest 里声明的标记文件名，
检查其中哪些文件存在，然后累加分数。

::: tip 这个特性值得直说
在从未装过插件的仓库里运行 `pmpx`，**不会执行任何第三方代码**。探测从不 `dlopen` 任何东西。
:::

## 第 1 步：找到项目根目录

`pmpx` 从你运行它的目录开始向上查找，寻找一个包含任意已安装插件所识别文件的目录。找到就停下。

有三个设置控制这次查找，都在全局配置的 `[discovery]` 表里：

| 配置项 | 默认值 | 含义 |
| --- | --- | --- |
| `walk_up` | `true` | `false` 时只检查起始目录，效果同 `--no-walk-up` |
| `max_depth` | `8` | 最多检查多少层目录，包含起始目录 |
| `stop_at_git` | `true` | 不向仓库根之上查找——上面的东西属于另一个项目 |

```toml
# <config-dir>/pmpx/config.toml
[discovery]
max_depth = 8
stop_at_git = true
```

`pmpx info` 会用文字说明这次查找做了什么：

```console
$ pmpx info
Start         /home/you/code/monorepo/packages/web
Project root  /home/you/code/monorepo
Walk-up       3 directories, stopped because: .git
```

## 第 2 步：给每个候选打分

每个插件 manifest 声明两组文件名：

```toml
# pnpm's pmpx-plugin.toml
[detect]
strong = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml"
]
weak = [ "package.json" ]
```

两级分档就是全部要点：

| 档位 | 分数 | 命中能证明什么 |
| --- | --- | --- |
| `strong` | **100** | lockfile、workspace 文件或形态标记——**这个后端确实解析过该项目** |
| `weak` | **10** | manifest 文件——**只能证明生态** |

对每个已安装插件，`pmpx` 把声明的每个名字拿去和项目根目录比对并累加命中。只有一个 `package.json`
会给所有 Node 后端各 10 分，谁也认不出来；`pnpm-lock.yaml` 给 pnpm 100 分，一锤定音。

### 一个具体例子

一个 pnpm monorepo 根目录，同目录下还有一个 Cargo crate：

```text
package.json         pnpm-lock.yaml       pnpm-workspace.yaml       Cargo.toml
```

| 插件 | Family | 命中 | 得分 |
| --- | --- | --- | --- |
| `pnpm` | node | `package.json` +10, `pnpm-lock.yaml` +100, `pnpm-workspace.yaml` +100 | **210** |
| `npm` | node | `package.json` +10 | 10 |
| `yarn` | node | `package.json` +10 | 10 |
| `bun` | node | `package.json` +10 | 10 |
| `cargo` | rust | `Cargo.toml` +10 | 10 |

有两个 family 参与——`node` 210 分，`rust` 10 分——Node 胜出。这不是硬编码的规则；见
[后端解析](/zh/guide/resolution)。

### family 取最大值，绝不求和

在同一个 family 内部，`pmpx` 取**得分最高的那个插件**，而不是把插件分数相加。`npm`、`yarn` 和
`bun` 都命中 `package.json` 各得 10 分；那是 30 分的巧合，不是 30 分的证据，所以这个 family 是
10 分。

::: tip 为什么这一点重要
它让不同 family 的分数可以横向比较——即使一个生态装了四个后端，另一个只装了一个。
:::

## 第 3 步：应用钉住

`.pmpx.toml` 里的钉住会给所属 family 一个 **50 分的地板**：

```toml
[plugin]
rust = "cargo"
```

是地板，不是替换。该 family 的分数变成 `max(得分, 50)`：

| 情况 | 得分 | 钉住之后 | 胜出 |
| --- | --- | --- | --- |
| 只有 `Cargo.toml`，对只有 `package.json` | rust 10, node 10 | rust **50**, node 10 | **rust** |
| 只有 `Cargo.toml`，对 `pnpm-lock.yaml` | rust 10, node 110 | rust **50**, node 110 | **node** |

::: warning 证据压过意图
第二行才是重点。钉住表达的是*“我知道这是个 Rust 项目”*——不是*“忽略那个就在眼前的 pnpm
lockfile”*。想真正覆盖证据，用 `-p`；它是一次性参数而不是持久设置，正是因为它很粗暴。
:::

## 第 4 步：解析并报告

打分产出的是 family；解析从中选一个。这个过程见[后端解析](/zh/guide/resolution)，而结果背后的
理由不用真的跑也能拿到：

```console
$ pmpx --explain build
```

## 已知的失败模式

一个**把 `Cargo.lock` gitignore 掉的库 crate**，从 `Cargo.toml` 只能拿到 10 分。如果同一个目录里
还放着一个 `package.json`，`node` 也是 10 分，Node 就靠默认的 family 优先级赢了。

::: warning 这不是一个等着被修的 bug
**没有 lockfile，你确实分辨不出来。** 两级分档存在的意义就是让这种"无法分辨"可见，而不是把它糊
过去。出路是把你的意思说出来：

```console
$ pmpx plugin set cargo
```
:::

## 探测到底读什么

只读名字。`pmpx` 只问声明的文件是否存在；它不打开、不解析、不做哈希、也不解释内容。

::: details 唯一的例外，以及它为什么是显式声明的
插件可以在自己的 manifest 里声明它想要**内容**的文件：

```toml
[context]
files = [
  "package.json",
  ".yarnrc.yml"
]
```

即便如此，读取和解析也属于插件——`pmpx` 永远不会知道里面是什么。Yarn 区分 classic 和 Berry 就是
靠这个：唯一的证据是 `.yarnrc.yml` 是否存在，而宿主完全不需要了解 Yarn 的任何事情。
:::

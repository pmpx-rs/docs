# 插件与商店

每个后端都是插件。`pmpx` 二进制里一个都不包含，这是设计而不是疏漏：编译进二进制的后端，不更新
`pmpx` 就没法更新；而一个面向 `pmpx` 从未听说过的生态的第三方后端，将需要 `pmpx` 维护者发一个
版本才能存在。

## 插件在哪里

| | |
| --- | --- |
| 目录 | `~/.pmpx/plugins/` —— Linux、macOS 和 Windows 上是同一个路径 |
| 可用什么覆盖 | `PMPX_DATA_DIR`，或 `[plugin_store] data_dir` |
| 内容 | 每个插件一个目录，里面是构建好的 cdylib 和它的 `pmpx-plugin.toml` manifest |

这个位置刻意放在*用户够得着的地方*，而不是平台数据目录里：插件出问题时你会想看看插件目录，而
“`pmpx` 显示的位置”和“商店实际使用的位置”是交给商店的同一个值，不是两套实现。

## 管理插件

```console
$ pmpx plugin ls                    # grouped by family; alias: list
$ pmpx plugin ls --flat             # no grouping
$ pmpx plugin current               # current per family, plus candidates and scores
$ pmpx plugin add pnpm              # install (name expands to pmpx-plugin-pnpm)
$ pmpx plugin add pnpm --version 0.3.0
$ pmpx plugin rm pnpm
$ pmpx plugin update                # all of them
$ pmpx plugin update pnpm
$ pmpx plugin search pnpm
$ pmpx plugin info pnpm
```

::: tip 列出插件不会执行第三方代码
`plugin ls` 只读 manifest——**不会发生 `dlopen`**——所以列出插件永远不会执行第三方代码。
:::

```console
$ pmpx plugin ls
node
  pnpm      0.3.0
  yarn      0.3.0
rust
  cargo     0.3.0
```

### 从本地 checkout 安装

`plugin add` 接受**路径**，就像接受名字一样自然。规则看的是参数*是什么*，而不是它怎么写：能解析
成一个包含 `pmpx-plugin.toml` 的目录的东西就是 checkout，其他一切都是 crate 名。

```console
$ cd ~/code/pmpx-plugin-mine
$ pmpx plugin add .
```

`pmpx` 会打印每个插件来自哪里，当插件和已发布的内容不一致时，这正是你想知道的：

```console
$ pmpx plugin add pnpm
Installing pnpm...
  pmpx-plugin-pnpm v0.3.0 (prebuilt) -> /home/you/.pmpx/plugins/pnpm
```

| 来源 | 含义 |
| --- | --- |
| `prebuilt` | 下载了 release 里的二进制 |
| `built locally` | 在本机从已发布的源码构建 |
| `built from <path>` | 从你指定的 checkout 构建 |

用哪一种由 `[plugin_store] prefer_prebuilt` 决定，默认为 `true`。关掉它意味着每次安装都从
源码编译——更慢，在没有预编译包的平台上很有用。

安装 **checkout** 时会先做检查，因为有一件事商店无法只凭 manifest 判断：*当前宿主*能否使用这个
插件。检查会把插件的 ABI 主版本和宿主的对比，因此版本不匹配会当场被报告成一个待修的版本问题，
而不是日后变成一次莫名其妙的加载失败。

## 钉住

```console
$ pmpx plugin set yarn      # writes the nearest .pmpx.toml
$ pmpx plugin unset node    # delete one family's pin
$ pmpx plugin unset --yes   # delete all of them
```

`plugin set` 写入的是 **family** 键，所以 `pmpx plugin set yarn` 产生 `node = "yarn"`。它写入
的文件是最近的 `.pmpx.toml`，不存在则创建。

不带 family 的 `plugin unset` 会删除所有钉住，这也是它要求 `--yes` 的原因：它是这条命令里唯一
一种会一次性丢掉多个判定的形式。

钉住的说明见[后端解析](/zh/guide/resolution)。

## 插件 manifest

每个已安装的插件都带一个 `pmpx-plugin.toml`。`plugin ls`、探测和版本检查读的就是它——回答这些
问题都不需要加载代码。

### 各个字段

```toml
[plugin]
name = "pnpm"
version = "0.3.0"
abi = 3
family = "node"

[detect]
strong = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml"
]
weak = [ "package.json" ]

[context]
files = [ "package.json" ]
```

| 键 | 谁读它 | 含义 |
| --- | --- | --- |
| `plugin.name` | 宿主，在加载之前 | 必须等于 `PackageManager::name()`；不一致则拒绝加载 |
| `plugin.version` | `plugin ls`、更新 | 必须等于该 crate `Cargo.toml` 里的 version |
| `plugin.abi` | 宿主，在加载之前 | 必须等于宿主的 `PMPX_ABI_MAJOR` |
| `plugin.family` | 分组、打分、钉住 | 这个后端所属的生态 |
| `detect.strong` | 探测 | 每次命中 100 分 |
| `detect.weak` | 探测 | 每次命中 10 分 |
| `context.files` | 插件，在调用时 | 插件可以读取其**内容**的文件 |

::: warning 名字或 ABI 不匹配会被拒绝加载
宿主会拒绝加载上报名字和 manifest 不一致的库，也会拒绝 ABI 主版本和自己不同的库；这是要修的版本
问题，不是等着排查的崩溃。
:::

## ABI 兼容性

插件 ABI 是有版本号的，主版本在加载时检查：

| | |
| --- | --- |
| 常量 | `PMPX_ABI_MAJOR` |
| 当前值 | `3` |
| 检查时机 | 在插件的代码运行之前 |
| 失败时 | 一个有类型的加载错误，而不是崩溃 |

### 两个值得知道的后果

- **插件不必和你的 rustc 相同。** cdylib 的边界是 `#[repr(C)]` 表和普通数字构成的 C ABI，所以
  用不同编译器版本构建的插件也能工作，只要 ABI 主版本一致。
- **次版本升级是兼容的。** 宿主在 3 这个主版本内变动时，`abi = 3` 继续可用。

## 写你自己的插件

### 简版

见[编写插件](/zh/plugins/authoring)。简版：实现一个 trait，加一行代码，用起始模板。

```console
$ git clone https://github.com/pmpx-rs/pmpx-plugin-starter
$ cd pmpx-plugin-starter
$ pmpx plugin add .
```

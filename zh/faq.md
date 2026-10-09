# 常见问题

## 通用

### `pmpx` 是 pnpm / cargo / npm 的替代品吗？

不是。它是它们的**前端**。干活的仍然是你的包管理器，lockfile 仍然归它所有，配置也仍然由它自己
读取。`pmpx` 只决定调用哪一个，并翻译动词。

### 为什么叫 “pmpx”？

它是 package-manager proxy：`pm` 是动词表层，`x` 代表背后的探测。二进制名为 `pmpx`。

### 它能工作之前需要先配置吗？

不需要。探测读取项目本来就有的文件，全局配置是可选的——文件不存在意味着全部使用默认值。它唯一
需要的是一个插件。

### 它在 Windows 上能用吗？

能，原生支持——不只是 WSL 下。程序路径解析的工作在 Windows 上最能体现价值：`pmpx` 在拉起进程
前解析出真实路径，因为在那里 `Command::new("pnpm")` 会失败。`CreateProcessW` 不做 `PATHEXT`
解析，而 pnpm 安装出来是 `pnpm.cmd`。

## 安装与插件

### 为什么 `pmpx` 说它什么都探测不到？

因为没有安装插件。

::: tip 这是设计，不是缺配置
内置后端就意味着一个不更新 `pmpx` 就没法更新的后端。
:::

```console
$ pmpx plugin add pnpm
$ pmpx plugin add cargo
```

### 有哪些插件？

`pmpx plugin search` 在 crates.io 上查找，官方插件都在 `pmpx-rs` 组织下：

| 生态 | 插件 |
| --- | --- |
| Node | `pmpx-plugin-pnpm`, `pmpx-plugin-npm`, `pmpx-plugin-yarn`, `pmpx-plugin-bun` |
| Rust | `pmpx-plugin-cargo` |

任何还没有已发布插件的 family，都可以通过写一个来补上——见[编写插件](/zh/plugins/authoring)。

### 我可以用 `pmpx` 处理一个没人写过插件的语言吗？

还不能，而且 `pmpx` 不会假装可以：它会以 `3` 退出，并给出*“no plugin for it”*。`Family` 类型
之所以是开放的，正是为了让下一个有人写出来的插件不需要 `pmpx` 发版就能被识别。

### 插件必须和 `pmpx` 用同一个 Rust 版本构建吗？

不必。边界是由 `#[repr(C)]` 表和普通数字构成的 C ABI，加载时对照 `PMPX_ABI_MAJOR` 检查。用
不同编译器构建的插件也能工作，只要 ABI 主版本一致。

### `pmpx` 仅仅为了列出插件就会运行插件代码吗？

::: tip 列出插件不加载插件代码
不会。`plugin ls`、探测和版本检查读的都是 `pmpx-plugin.toml`。只有在确实需要某个插件的命令时，
它的库才会被加载。
:::

## 行为

### 它选错了后端，怎么办？

先查清原因——答案通常是看得见的：

```console
$ pmpx info          # every candidate and every score
$ pmpx --explain build
```

然后要么钉住它：

```console
$ pmpx plugin set cargo
```

要么覆盖一次：

```console
$ pmpx -p cargo build
```

### 这明明是个 Rust 项目，为什么它选了 Node？

因为没有任何东西表明它是。一个**gitignore 掉 `Cargo.lock` 的库 crate** 从 `Cargo.toml` 拿到
10 分；隔壁的 `package.json` 也是 10 分；Node 按默认 family 顺序胜出。

::: warning 没有 lockfile，你确实分辨不出来
这就是那个已知的失败模式，它不是一条等着被修掉的规则。出路是 `pmpx plugin set cargo`。见
[pmpx 如何探测项目](/zh/guide/detection)。
:::

### “混合项目默认走 Node”是硬编码的吗？

不是。它就是默认的 `family_priority` 数组，你可以改：

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

把 `rust` 挪到最前面，同一个混合仓库就会走 `cargo`。代码里任何地方都没有这条规则。

### 为什么 `pmpx build` 以 `2` 退出？

因为后端对 `build` 没有答案。除 `exec` 之外的每个动词都会如实报告，而不是猜一个看起来合理的东西
——`--explain` 会显示问了哪个插件。

### 为什么一个插件都没有时 `pmpx exec` 也能用？

`exec` 是唯一允许降级的动词：没有后端应答时，`pmpx` 自己执行命令。它是逃生口，而一个还需要插件的
逃生口是很差的逃生口。

## 输出

### 我能解析它吗？

可以：

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

::: tip stdout 是 JSONL，其他什么都没有
所有给人看的内容——包括后端自己的输出——都去 stderr。见 [JSON 输出](/zh/reference/json)。
:::

### 为什么 `--json plugin ls` 会失败？

因为那条命令的结果是表格，而把散文混进调用方正在解析的流里，会在某个和 `pmpx` 看不出关系的地方
产生解析错误。它改为以退出码 `2` 拒绝。

### 为什么我的命令输出不在 JSON 流里？

这是设计如此。在 `--json` 下，后端写到 stderr，这正是 stdout 保持可解析的原因。想把后端的输出
存进文件，就重定向 stderr：

```bash
pmpx --json install > events.jsonl 2> install.log
```

### 能关掉 `pmpx → cargo build` 这一行吗？

```console
$ pmpx -q build
```

`--quiet` 会静音 stderr 上的叙述。后端的输出不受影响。

## 文件与状态

### `pmpx` 会往哪里写？

三个地方，都是它自己的：

| 路径 | 是什么 |
| --- | --- |
| `<config-dir>/pmpx/config.toml` | 全局配置 |
| `~/.pmpx/` | 已安装的插件 |
| 项目的 `.pmpx.toml` | 只在你要求时——`pmpx plugin set` |

### 为什么我的项目里没有缓存文件？

::: tip 不值得弄脏工作区
因为缓存省下的时间不到一毫秒，代价却是一个被弄脏的工作区。每次调用 `pmpx` 都会重新读取它需要的
那几个文件名。
:::

### 它会读 `~/.npmrc` 或我的 registry 配置吗？

**不会——连读都不读。**

::: warning 没有任何形式的代理、镜像或 registry 功能
这些都在你的 shell 或各工具自己的配置里设置；`pmpx` 拉起进程时原样继承环境。
:::

刻意从不触碰的东西：

```text
~/.cargo/config.toml   ~/.npmrc   ~/.yarnrc   ~/.yarnrc.yml   ~/.bunfig.toml
~/.config/pip/*        ~/.gemrc   src/**     *.lock
```

注意最后两项：`pmpx` 不改你的源码，也不改你的 lockfile——只有底层工具才做这些，和它被直接调用时
完全一样。

### 它会自动检查更新吗？

不会。没有后台检查，没有启动提示条。想知道的时候用 `pmpx self update --check` 去问。

### 怎么卸载它？

一个二进制、一个插件目录、一个配置目录——如果归 cargo 管理，再加一句 `cargo uninstall pmpx`。
[安装](/zh/guide/installation)里有具体命令。

## 参与贡献

### 在哪里报告 bug？

<https://github.com/pmpx-rs/pmpx/issues>

请附上 `pmpx info` 的输出——它一块儿包含了查找过程、配置文件、得分和插件的构建信息。

### workspace 是怎么组织的？

| 路径 | 是什么 |
| --- | --- |
| `crates/pmpx/` | 宿主的二进制 |
| `crates/pmpx-plugin/` | 插件契约：trait、C ABI 垫片、`export!` |
| `crates/pmpx-plugin-abi/` | 裸的 `#[repr(C)]` 接口面 |
| `crates/pmpx-detect/` | 由数据计算出的判定 |
| `crates/pmpx-engine/` | 解析、拉起、等待、报告退出码 |
| `crates/pmpx-loader/` | `dlopen` 的宿主侧 |
| `crates/pmpx-project/` | 配置的读取、合并与写入 |

每个后端都在自己的仓库里，单独发布。

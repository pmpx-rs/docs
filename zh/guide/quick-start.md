# 快速开始

## 1. 安装一个插件

`pmpx` 自身不带任何后端，所以第一件事就是给它一个。名字会展开成 crate：`pnpm` 对应
`pmpx-plugin-pnpm`。

```console
$ pmpx plugin add pnpm
$ pmpx plugin add cargo
```

看看装上了什么：

```console
$ pmpx plugin ls
node
  pnpm      0.3.0
rust
  cargo     0.3.0
```

::: tip 有哪些插件可用
`pmpx plugin search <关键词>` 会在 crates.io 上搜索。官方插件都在 `pmpx-rs` 组织下——见
[插件与插件商店](/zh/reference/plugins)。
:::

## 2. 问它这是什么目录

切到任意一个你手上的项目，不带参数运行 `pmpx`。它什么都不跑——只报告判断结果。

```console
$ cd ~/code/my-frontend
$ pmpx
Project root  /home/you/code/my-frontend
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

`score 220` 是 `pnpm-lock.yaml`(100) + `pnpm-workspace.yaml`(100) + `package.json`(10)。想看完整
过程，包括每个落选的候选：

```console
$ pmpx info
```

那份输出是一张表，说明命中了什么、每个标记值多少分——它是理解某个仓库为什么这样解析的最快路径。

## 3. 跑点什么

现在这些动词在你站的任何仓库里都会按预期工作。

```console
$ pmpx install            # install the whole tree
$ pmpx install lodash     # add a dependency
$ pmpx run dev            # run a script
$ pmpx build
$ pmpx test
$ pmpx remove lodash
$ pmpx update
```

这些命令在 Rust 仓库里一字不改地照样能用，只是落到 `cargo` 上：

```console
$ cd ~/code/my-crate
$ pmpx install            # → cargo fetch
$ pmpx install serde      # → cargo add serde
$ pmpx test               # → cargo test
```

### 透传参数

`--` 之后的一切都原样交给后端。`pmpx` 不解析它、不重排它，也不对它发出警告。

```console
$ pmpx test -- --nocapture
$ pmpx run dev -- --port 3000
```

::: tip `run` 为什么保留分隔符
`pmpx run dev -- --port 3000` 的意思是*“跑 `dev` 这个脚本，并把 `--port 3000` 传给它”*。后端必须
能把这种情况和属于 `run` 自身的参数区分开，而只有你最初的命令行带着这个区分——所以它被保留而不是
被拍平。
:::

### 逃生口

`exec` 是唯一允许后端"没有答案"的动词。当前端没有答案时，`pmpx` 自己执行这条命令：

```console
$ pmpx exec tsc --noEmit
$ pmpx exec ls -la          # works with zero plugins installed
```

其他动词在这种情况下一律报错，而不是猜一个——这是明确的例外，不是静默的魔法。

## 4. 看看翻译结果

如果你想知道将要跑什么、但先不跑：

```console
$ pmpx --explain build
```

想看它真的跑起来、并带上引擎自己的耗时：

```console
$ pmpx --debug build
```

## 5. 猜错了就钉住它

一个把 `Cargo.lock` gitignore 掉的库 crate，从 `Cargo.toml` 只能拿到 10 分，可能输给隔壁的
`package.json`。这种情况下直接说出来，不要去和优先级数组较劲：

```console
$ pmpx plugin set cargo
```

它会写最近的那个 `.pmpx.toml`：

```toml
[plugin]
rust = "cargo"
```

::: warning 钉住是地板，不是覆盖
它给所属 family 50 分。这能压过弱证据，并且会**故意输给**真实的 lockfile——钉住表达的是*“我知道这
是个 Rust 项目”*，不是*“忽略那个 lockfile”*。
:::

想连证据一起覆盖，用一次性参数：

```console
$ pmpx -p cargo build
```

## 接下来看什么

- [自动探测原理](/zh/guide/detection) —— 完整的打分机制。
- [后端解析](/zh/guide/resolution) —— family、优先级和钉住。
- [命令参考](/zh/reference/commands) —— 每个动词、参数和别名。

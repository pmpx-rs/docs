# 命令参考

## 动词

有七个动词由后端翻译。`--` 之后的所有内容原样透传。

| 动词 | 别名 | 不带参数 | 带参数 |
| --- | --- | --- | --- |
| `install` | `i`, `add` | 从 lockfile 安装 | 添加一个依赖 |
| `remove` | `rm`, `uninstall` | — | 移除一个依赖 |
| `run` | `r` | — | 运行一个脚本 / target |
| `build` | `b` | 构建 | 透传给后端 |
| `test` | `t` | 测试 | 透传给后端 |
| `update` | `up` | 更新依赖 | 更新指定的那些 |
| `exec` | `x` | — | 逃生口，见下文 |

```console
$ pmpx install            # install the whole tree
$ pmpx install serde      # add a dependency
$ pmpx run dev            # run a script
$ pmpx test               # run the tests
$ pmpx update             # update the lockfile
$ pmpx exec tsc --noEmit  # run a command through the backend
```

`remove` 至少需要一个包名；`install`、`run`、`update` 和 `exec` 都有无参数形式。某个后端支持
哪些无参数形式是后端自己的事，`pmpx` 在得不到答案时返回 `2`，而不是自己编一个。

::: tip 每个动词在各后端会变成什么
完整的 `pmpx` → `pnpm` → `cargo` 映射表在[简介](/zh/guide/introduction)。
:::

### 透传参数

`--` 之后的所有内容原样交给后端。`pmpx` 不解析它，不重排它，也不会为它报警告。

```console
$ pmpx test -- --nocapture
$ pmpx run dev -- --port 3000
$ pmpx build -- --release
```

::: tip `run` 为什么保留分隔符
插件必须能区分 target 自己的参数和要透传的参数——`cargo run -- --release` 和
`cargo run --release` 含义不同——而只有你原始的命令行带有这个区分信息。
:::

### 不带参数的 `install`

| 后端 | 解析为 |
| --- | --- |
| pnpm | `pnpm install` |
| npm | `npm install` |
| yarn | `yarn install` |
| bun | `bun install` |
| cargo | `cargo fetch` |

这里是 `cargo fetch` 而不是 `cargo build`，因为这个动词是 *install*：它关心的是让依赖就位，而
不是编译。

## `exec` —— 逃生口

```
pmpx exec <cmd...>
   ├─ plugin supports exec     → its answer (npx, pnpm exec, …)
   └─ it does not, or no project → pmpx runs the command itself
```

这是唯一允许降级的动词：

```console
$ pmpx exec ls -la     # works with zero plugins installed, outside any project
```

::: warning 其他动词都会响亮地失败
一个在后端没有答案时悄悄跑了别的东西的 `pmpx build`，比直接失败更糟，所以它报错并以 `2` 退出。
:::

## 其他命令

| 命令 | 作用 |
| --- | --- |
| `pmpx` | 这个目录是什么，以及哪个插件会运行。不执行任何东西。 |
| `pmpx info` | 全部内容：查找过程、配置文件、钉住、所有候选和得分、已加载插件的构建信息 |
| `pmpx plugin ls` | 已安装的插件，按 family 分组（只读 manifest——不做 `dlopen`） |
| `pmpx plugin current` | 每个 family 当前的插件，以及候选和得分 |
| `pmpx plugin set <name>` | 在最近的 `.pmpx.toml` 中钉住一个插件 |
| `pmpx plugin unset [family]` | 删除一条钉住 |
| `pmpx plugin add <name>` | 安装一个插件 |
| `pmpx plugin rm <name>` | 移除一个插件 |
| `pmpx plugin update [name]` | 更新插件 |
| `pmpx plugin search <keyword>` | 在 crates.io 上搜索 |
| `pmpx plugin info <name>` | 某个插件的本地状态及其 crates.io 信息 |
| `pmpx config get <key>` | 读取一个全局配置键 |
| `pmpx config set <key> <value>` | 写入一个全局配置键 |
| `pmpx completion <shell>` | 把补全脚本打印到 stdout |
| `pmpx self update` | 替换当前二进制 |

插件相关命令的细节见[插件与商店](/zh/reference/plugins)；`self update` 的细节见
[自更新](/zh/reference/self-update)。

## `pmpx`

不带子命令也不带标志时，`pmpx` 只说明它看到了什么，然后结束。它不执行任何东西，也不加载任何
插件。

```console
$ pmpx
Project root  /home/you/code/my-frontend
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

可能有两种退出码：找到东西时是 `0`，没有探测到项目时是 `3`。

::: tip 可以在脚本里当判断条件用
```bash
if pmpx -q >/dev/null 2>&1; then
  echo "this is a pmpx project"
fi
```
:::

## `pmpx info`

唯一一个会加载胜出插件但**不运行它**的命令，因为它打印的诊断信息——插件编译时用的版本和目标
平台——只存在于已加载的库里。

```console
$ pmpx info
Start         /home/you/code/monorepo/packages/web
Project root  /home/you/code/monorepo
Walk-up       3 directories, stopped because: .git
Project config  (nearest first, nearest wins)
              /home/you/code/monorepo/packages/web/.pmpx.toml
              /home/you/code/monorepo/.pmpx.toml
  pinned      node = "yarn"

Installed plugins
  pnpm       node      v0.3.0
  cargo      rust      v0.3.0
  yarn       node      v0.3.0

Candidates and scores
  node  score 210
    pnpm     score  210   package.json, pnpm-lock.yaml, pnpm-workspace.yaml
    yarn     score   10   package.json
    npm      score   10   package.json
  rust  score  10
    cargo    score   10   Cargo.toml

Selected      yarn (pmpx-plugin-yarn)
  reported name  yarn
  reported family node
  compiled with  rustc 1.88.0
  target         x86_64-unknown-linux-gnu
```

::: tip 怎么读一个意外的结果
把 `pinned` 那一行和得分一起看。钉住会给它所属的 family 一个 50 分的下限，而这个下限直接体现在
那个数字上——通常这就是全部的解释。
:::

## `pmpx completion`

只把补全脚本打印到 stdout，其他什么都不输出，所以重定向要你自己来：

::: code-group

```bash [bash]
pmpx completion bash > ~/.local/share/bash-completion/completions/pmpx
```

```zsh [zsh]
pmpx completion zsh > ~/.zfunc/_pmpx
```

```powershell [PowerShell]
pmpx completion powershell | Out-String | Invoke-Expression
```

```fish [fish]
pmpx completion fish > ~/.config/fish/completions/pmpx.fish
```

:::

## 退出码

完整表格在单独一页——[退出码](/zh/reference/exit-codes)——但当你考虑要不要在 CI 里用 `pmpx`
时，真正要紧的是这一条：

> `pmpx test` 以**后端自己的退出码**退出。测试失败时它必须失败。

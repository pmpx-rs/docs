# 全局标志

这里每个标志都是全局的：它可以出现在子命令之前或之后，作用于整次运行。

| 标志 | 含义 |
| --- | --- |
| `-p, --plugin <NAME>` | 使用这个插件，**覆盖 `.pmpx.toml`** |
| `-C, --dir <PATH>` | 在这个目录里操作（等同于先 `cd` 过去） |
| `--no-walk-up` | 只看当前目录；不向上查找到项目根目录 |
| `-q, --quiet` | 抑制 stderr 上的提示和解析出的命令 |
| `--debug` | 打印本次运行的调试信息 |
| `--json` | 把这次运行以 JSON 打印到 stdout，每行一个对象 |
| `--explain` | 报告后端是如何选出的，不执行任何东西 |

## 标志详解

### `-p, --plugin <NAME>`

一次性的覆盖，不写入磁盘。想让它永久生效，用 `pmpx plugin set`。

```console
$ pmpx -p cargo build
```

::: tip 唯一能压过证据的东西
`.pmpx.toml` 里的钉住给它所属的 family 一个 50 分的下限；`-p` 则完全跳过判定。这是刻意的：你
亲手敲的标志含义明确、不留下任何东西，所以它可以是一把钝器。
:::

### `-C, --dir <PATH>`

运行起来就像你先 `cd` 过去一样，但 shell 自己的工作目录不受影响。在脚本和编辑器里很有用，因为
那里改变进程目录要么做不到，要么不礼貌。

```console
$ pmpx -C ../other-repo test
$ pmpx -C /abs/path/to/repo
```

### `--no-walk-up`

把查找限制在你所在的目录。与之对应的是全局配置里的 `[discovery] walk_up`，它是同一个开关的持久化
版本。

```console
$ pmpx --no-walk-up info
```

这个标志用于*“我知道这个子目录是独立项目，父目录的 `package.json` 不是我的”*这种情况——向上
查找确实找到了一个真项目，但那是错的那个。

### `-q, --quiet`

抑制 **stderr** 上的提示和解析出的命令。后端自己的输出不受影响，所以 `pmpx -q build > log` 的
含义仍然和看上去一样。

它静音的是有歧义的探测结果、未安装的候选，以及 `pmpx → cargo build` 这样的播报——静音的是
叙述，不是结果。

### `--debug`

每个阶段一行，输出到 stderr。`--quiet` 不会把它关掉，因为同时要求两者是一个值得回答的问题。

阶段开关在宿主一侧，这正是 `--debug` 不会变成插件可以据此分支的输入的原因：**调试运行执行的
命令和其他任何一次运行逐字节相同。**

```console
$ pmpx --debug build
```

### `--json`

把一次运行变成程序可读的流。事件结构见[JSON 输出](/zh/reference/json)。一句话：stdout 是
JSONL，所有给人看的内容都去 stderr。

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

::: warning 不是每条命令都有 JSON 形式
只有那些*执行*东西的命令才有。结果是表格的命令——比如 `pmpx plugin ls`——会拒绝这个标志并以 `2`
退出，而不是悄悄把散文混进调用方正在解析的流里。
:::

### `--explain`

回答*“这是怎么判定的？”*，并且不执行任何东西。它在任何东西被加载或拉起之前就解析完成，所以它的
开销就是看上去那样。

```console
$ pmpx --explain build
```

它会报告命中的标记、生效的钉住、得分和胜者——包括任何平局，平局意味着这个仓库距离产生歧义只差
一次提交。

如何读这段输出见[后端解析](/zh/guide/resolution)。

## 组合使用

| 目标 | 命令 |
| --- | --- |
| 为一条命令强制指定后端 | `pmpx -p cargo test` |
| 在另一个仓库里运行 | `pmpx -C ../repo install` |
| 把这个目录当成整个项目 | `pmpx --no-walk-up info` |
| 静音提示，保留结果 | `pmpx -q build > log` |
| 把运行当成流来读 | `pmpx --json build` |
| 静默、可解析的运行 | `pmpx -q --json test \| jq` |
| 查明为什么选错了 | `pmpx --explain build` |
| 归因一次运行的耗时 | `pmpx --debug build` |

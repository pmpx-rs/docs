# JSON 输出

`--json` 把一次运行变成程序可读的流。

```console
$ pmpx --json build | jq -c 'select(.event == "finished")'
{"code":0,"event":"finished"}
```

## 约定

| 流 | 承载什么 |
| --- | --- |
| **stdout** | 每行一个 JSON 对象，其他什么都没有 |
| **stderr** | `pmpx → …` 播报、备注、警告，以及**后端自己的输出** |

第二行就是全部设计。在 `--json` 下，后端写到 **stderr** 而不是 stdout，所以 stdout 无需过滤
即可解析。

::: tip 不带这个标志时一切照旧
输出仍然是实时的，颜色仍在，`pmpx build > log` 的含义一如既往。`--json` 是一个你主动进入的模式，
不是新的默认值。
:::

用 JSONL 而不是一个数组，因为脚本希望每个事件一到达就能拿到（一次构建要花几分钟），而 `jq` 反正
也是逐行读。

## 事件

几乎每个脚本只需要其中两个：`starting`（即将运行什么）和 `finished`（结果如何）。其余的携带的是
需要解释某件事时才去查的细节。

### `starting` 与 `finished`

<!-- 标为 `text` 而不是 `json`：这是 JSONL，两行两个独立对象，不是一个 JSON 文档。
     把代码块当 JSON 解析的工具会拒绝这个页面正在解释的格式。 -->

```text
{"event":"starting","program":"cargo","args":["test","--nocapture"],"cwd":"/home/you/code/my-crate"}
{"event":"finished","code":101}
```

`cwd` 是命令运行的位置，不一定是你调用 `pmpx` 的位置——在插件的答案里，它可能是项目根目录。

::: details 全部事件及各自字段
| `event` | 字段 | 何时 |
| --- | --- | --- |
| `resolved` | `program`, `path`, `kind` | 定位到了后端真正的可执行文件 |
| `starting` | `program`, `args`, `cwd` | 进程即将启动 |
| `finished` | `code` | 进程已退出 |
| `phase` | `name`, `micros`, `detail` | 引擎自己的耗时，按阶段 |
| `warning` | `text` | 有东西被截断或猜测了 |
| `note` | `text` | 一条提示 |
| `error` | `text` | pmpx 自身的失败 |
| `notes` | `plugin`, `notes` | 插件附在它答案上的备注 |
| `plugin` | `plugin`, `level`, `text` | 插件自己的 `debug!` / `info!` / `warn!` / `error!` |

### `resolved`

```json
{ "event": "resolved", "program": "cargo", "path": "/home/you/.cargo/bin/cargo", "kind": "native" }
```

`kind` 表示程序将以何种方式启动：

| `kind` | 含义 |
| --- | --- |
| `native` | 真正的可执行文件 |
| `cmd` | Windows 的 `.cmd` shim，需要 `cmd.exe` |
| `powershell` | Windows 的 `.ps1` shim |

`path` 是解析后的路径，不是你输入的名字。在 Windows 上 `Command::new("pnpm")` 会直接失败，因为
`CreateProcessW` 不做 `PATHEXT` 解析，而 pnpm 装出来是 `pnpm.cmd`——所以这个事件正是用来解释
某件事为什么跑了、或者为什么没跑的那个。

### `phase`

```json
{ "event": "phase", "name": "detect", "micros": 82, "detail": "3 plugins scored" }
```

引擎会自己计时，所以一次运行的耗时可以被归因，而不是靠猜。多数运行里有意思的部分是你的后端；这些
数据是用来看清剩下的时间花在哪的。
:::

## 退出码不变

`--json` 不改变退出码。测试失败仍然是 `101`，而一个以

```json
{ "event": "finished", "code": 101 }
```

结尾的流，进程也以 `101` 退出。

## 哪些命令接受它

只有真正运行东西的那些：`install`、`remove`、`run`、`build`、`test`、`update`、`exec`。

结果是**表格**的命令会拒绝这个标志并以 `2` 退出：

```console
$ pmpx --json plugin ls
pmpx: `--json` is not supported by this command yet
$ echo $?
2
```

::: warning 拒绝正是重点
把散文混进调用方正解析的流里，会在他们的代码里产生一个解析错误，而那个位置和 `pmpx` 看起来毫无
关系。
:::

## 实际例子

### 后端退出非零时让构建步骤失败

```bash
pmpx --json test > events.jsonl || exit $?
```

退出码本来就来自后端，所以 shell 的 `||` 行为正常。

### 报告实际运行的是哪个工具

```bash
pmpx --json build | jq -r 'select(.event == "resolved") | .path'
```

### 统计一次运行各阶段的耗时

```bash
pmpx --json --debug build \
  | jq -r 'select(.event == "phase") | "\(.micros / 1000 | round)ms\t\(.name)"'
```

### 观察一次长时间运行而不丢输出

```bash
pmpx --json install > events.jsonl
```

stdout 是事件流；人类可读的安装日志在 stderr 上，仍然显示在终端里，也可以用 `2>install.log`
单独重定向。

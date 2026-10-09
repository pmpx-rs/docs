# 退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 成功 |
| `1` | `pmpx` 自身失败，**或插件 panic 了** |
| `2` | 用法错误，或后端不支持该动词 |
| `3` | 没有探测到项目、没有对应的插件，或工具不在 `PATH` 上 |
| **N** | **后端自己的退出码，原样传递** |

最后一行才是重点。`pmpx test` **必须在测试失败时失败**，所以后端的退出状态被当作进程的退出状态
返回，而不是被包成一个 pmpx 错误。`cargo test` 以 `101` 退出，`pmpx test` 就以 `101` 退出。

```console
$ pmpx test
...
$ echo $?
101
```

正是这个特性让 `pmpx` 可以放心塞进已有的 CI 脚本：把 `cargo test` 换成 `pmpx test`，并不会
改变任务什么时候变红。

## pmpx 自己的四种退出码

### `0` —— 成功

也包括什么都没执行的情况：`pmpx`、`pmpx info`、`pmpx --explain <verb>`，以及 `plugin` /
`config` / `completion` 系列命令，都以“报告成功”的方式成功。

### `1` —— pmpx 失败，或插件 panic

`pmpx` 自身的内部失败，以及插件 panic 的兜底。插件 `command` 里的 panic 会被转成
`PMPX_ERR_INTERNAL`，而不是被允许越过 `extern "C"` 边界——跨越那条线展开栈是未定义行为，所以它
会被捕获。

如果从某个插件那里看到 `1`，那说明这个插件有 bug；`--debug` 是排查起点。

### `2` —— 用法错误，或动词不受支持

两种不同的情况共用这个退出码，因为它们的解决办法相同：**你要求的东西根本不在供给之列。**

```console
$ pmpx                              # fine — reports the detection
$ pmpx build extra-arg              # usage error: build takes no positional argument
$ pmpx remove                       # usage error: remove needs a package name
$ pmpx plugin set                   # usage error: set needs a name
$ pmpx --json plugin ls             # this command has no JSON form
$ pmpx build                        # 2, if the backend has no answer for "build"
```

最后一条是要记住的。后端表达不了某个动词时会明说，`pmpx` 把它报告为 `2`，而不是猜一个看起来
合理的命令。

### `3` —— 没什么可运行的

三种不同的原因，共用一个退出码，因为从脚本的角度看它们是同一个答案：*这里没有我能做的事。*

| 原因 | 如何分辨 |
| --- | --- |
| 没有探测到项目 | `pmpx` 会打印它的错误；`pmpx info` 显示所有得分都是 0 或不存在 |
| 探测到的 family 没有插件 | `pmpx plugin ls` 里缺少那个 family |
| 工具不在 `PATH` 上 | 错误信息里点名了找不到的程序 |

```console
$ cd /tmp && pmpx build
$ echo $?
3
```

这就是光秃秃的 `pmpx` 能当判断条件用的原因：

```bash
if pmpx -q >/dev/null 2>&1; then
  echo "a pmpx project"
fi
```

## 信号与异常退出码

::: details 信号或超宽退出码是怎么报告的
| 情况 | 结果 |
| --- | --- |
| 后端被信号杀死 | 平台惯例——在 Unix 上是 `128 + signal` |
| 后端以超出 8 位的退出码退出 | 截断到低 8 位，并产生一个 `warning` 事件 |
| 后端以 `0` 退出但打印了错误 | 就是 `0`。`pmpx` 报告实际发生的事，不去替它推翻结论 |

截断这种情况值得了解，因为它在 `--json` 里看得见：

```console
$ pmpx --json test 2>/dev/null | grep warning
{"event":"warning","text":"exit code 256 does not fit in 8 bits; using 0"}
```
:::

## 在 CI 里使用

```bash
set -e
pmpx install
pmpx build
pmpx test -- --nocapture
```

不需要包装脚本，不需要 `|| true`，不需要翻译退出码。`set -e` 的行为和直接调用底层工具时一样，
这正是退出码被原样传递而不是被归一化的全部理由。

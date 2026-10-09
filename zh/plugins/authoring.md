# 编写插件

插件是一个 Rust crate，只回答一个问题：**给定一个动词和它的参数，应该运行什么？** 其他一切——
探测、拉起进程、退出码、输出——都归宿主。

## 构建一个插件

### 从模板开始

```console
$ git clone https://github.com/pmpx-rs/pmpx-plugin-starter
$ cd pmpx-plugin-starter
$ pmpx plugin add .
```

模板可以立刻构建并安装。它的标记文件名刻意选了任何真实项目都不会有的名字，所以你在开发它时，它
永远不会和真实后端竞争。

### 一个完整的插件

全部内容就这么多——一个 trait，一个函数：

```rust
use std::ffi::OsString;
use pmpx_plugin::{CommandSpec, Context, Family, PackageManager, PluginError, Verb};

struct CargoPlugin;

impl PackageManager for CargoPlugin {
    fn name(&self) -> &str { "cargo" }
    fn family(&self) -> Family { Family::RUST }

    fn command(&self, ctx: &Context, verb: Verb, args: &[OsString])
        -> Result<CommandSpec, PluginError>
    {
        match verb {
            Verb::Install if args.is_empty() => Ok(CommandSpec::new("cargo").arg("fetch")),
            Verb::Install => Ok(CommandSpec::new("cargo").arg("add").args(args.iter())),
            Verb::Remove  => Ok(CommandSpec::new("cargo").arg("remove").args(args.iter())),
            Verb::Update  => Ok(CommandSpec::new("cargo").arg("update").args(args.iter())),
            Verb::Run     => Ok(CommandSpec::new("cargo").arg("run").args(args.iter())),
            Verb::Build   => Ok(CommandSpec::new("cargo").arg("build").args(args.iter())),
            Verb::Test    => Ok(CommandSpec::new("cargo").arg("test").args(args.iter())),
            // Say so rather than guessing — the host degrades `exec` for you
            Verb::Exec => Err(PluginError::unsupported_verb(verb)),
        }
    }
}

/// The factory the generated wrapper calls.
pub fn create() -> Box<dyn PackageManager> { Box::new(CargoPlugin) }
```

### manifest

`pmpx-plugin.toml` 和该 crate 的 `Cargo.toml` 放在一起。它**在不加载任何代码的情况下**被读取，
这正是 `plugin ls` 和探测可以在任何仓库里安全运行的原因。

```toml
[plugin]
name = "cargo" # must equal `PackageManager::name()`
version = "0.3.0" # must equal Cargo.toml's version
abi = 3 # PMPX_ABI_MAJOR
family = "rust"

[detect]
strong = [ "Cargo.lock" ] # 100 points: this backend actually resolved the project
weak = [ "Cargo.toml" ] # 10 points: this only proves the ecosystem

[context]
files = [ "Cargo.toml" ] # contents this plugin is allowed to read
```

把 `strong` 和 `weak` 填对，是写插件时最关键的一个决定。[探测指南](/zh/guide/detection)解释了
两个档位；简版是：lockfile 放 `strong`，manifest 放 `weak`。

::: tip 为什么名字要检查两次
宿主会拒绝加载上报名字和 manifest 不一致的库。这正是用来抓出由不匹配部件拼成的插件目录——新
manifest 旁边放着旧库——的办法，而不是让一个后端的代码顶着另一个后端的身份运行。
:::

## `command()` 遵守的规则

### `command()` 是纯映射

整座架构都立在这条规则上。`command()` **不得**：

- 读文件
- 写文件
- 读环境变量
- 运行进程
- 发起网络请求

它接收动词、参数以及宿主已知的信息，返回一条命令。正是这种纯粹性让插件可以用 `cargo test` 测试，
让 `--debug` 不构成输入，也让 ABI 边界小到可以审计。

### 当文件名不够用时

真实的包管理器会根据文件*内容*做决定，Yarn 是典型例子：classic 和 Berry 对 `update` 的写法不同，
而唯一的证据是一个文件。

插件在自己的 manifest 里声明它想读什么：

```toml
[context]
files = [
  "package.json",
  ".yarnrc.yml"
]
```

然后精确地读这些内容：

```rust
// The plugin parses it; pmpx never learns what is inside.
if ctx.file_str("package.json").is_some_and(|s| s.contains("\"packageManager\"")) { ... }
```

**宿主读取字节并把它们交出去，不做任何解释。** 未声明的文件名永远读不到，所以边界始终是明确的：
插件只能看到它说过自己需要的东西。

### 同一思路的另一半

有时答案就是一个*文件名*，内容根本不需要。宿主会报告哪些标记命中了，插件读这个结果，而不是自己
去试探：

```rust
// Yarn classic and Berry spell this one verb differently, and the only evidence is a file.
Verb::Update if ctx.has_matched(".yarnrc.yml") => Ok(CommandSpec::new("yarn").arg("up")),
Verb::Update => Ok(CommandSpec::new("yarn").arg("upgrade")),
```

这就是形态判断要走 `Context::matched` 而不是文件系统的原因。

## Context 与日志

### `Context` 携带什么

| 字段 / 方法 | 它告诉你什么 |
| --- | --- |
| `project_root` | 探测到项目的那个目录 |
| `start_dir` | **人运行 `pmpx` 的位置**——判断这是 monorepo 里哪个包的唯一途径，而且*不是*命令将运行的位置 |
| `matched` / `has_matched(name)` | 哪些探测标记命中了 |
| `reason` 和 `score` | 这个插件为什么被选中，得分为多少 |
| `pins` / `was_pinned()` / `pinned_for(family)` | 项目里的钉住，按读取时的状态 |
| `config_files` | 收集到的项目配置文件 |
| `file(name)` / `file_str(name)` | 声明的 `[context] files`，以字节或文本形式 |

`start_dir` 和 `project_root` 的区别最容易咬人。在 monorepo 里两者都真实存在，而且不同：
`project_root` 是 lockfile 所在的地方，`start_dir` 是你站着的那个包。

### 日志

插件**通过宿主**来说明自己，所以它的输出不会破坏 `--json` 流：

```rust
pmpx_plugin::debug!("resolved via berry");
pmpx_plugin::info!("using the workspace root");
pmpx_plugin::warn!("no lockfile; assuming the default");
pmpx_plugin::error!("could not map this verb");
```

宿主会加上插件的 id，并决定打印什么：

```text
pmpx debug: [pnpm] context: root=… start=… matched=[package.json pnpm-lock.yaml] verb=install …
```

`debug::context()` 把整个 context 打在一行里，这通常是查清插件为什么看到了意外内容的最快方式。

这个开关在**宿主**一侧，这正是 `--debug` 不会变成插件可以据此分支的输入的原因：调试运行执行的
命令和其他任何一次逐字节相同。没有宿主时——插件自己的 `cargo test`——这些宏回退到 stderr，所以
你仍然能看到它们。

## ABI 与 panic

### ABI，以及你为什么看不到它

插件 crate 是一个**普通 rlib**：没有 `#[no_mangle]`，没有 `crate-type`。

```toml
# Cargo.toml
[lib]
# Nothing special. It is an ordinary library.
```

::: details 为什么插件作者看不到 ABI
`pmpx` 安装（或打包）插件时，会生成一个几行的包装层，它调用 `pmpx_plugin::export!(create)`，并
把**那个**构建成 cdylib。整个 C ABI 垫片——`catch_unwind`、字符串生命周期、能力表——都是生成
的，所以插件作者根本看不到这些。

rlib 这种形态也正是 `cargo test` 能直接在插件上跑起来的原因：不需要宿主，不需要 `dlopen`，也不
需要 fixture。
:::

::: warning `export!` 写在包装层里，不是在插件里
两处都写会重复定义 `pmpx_plugin_entry_v3`，链接会失败。插件 crate 唯一的义务就是
`pub fn create() -> Box<dyn PackageManager>`。
:::

### Panic

| panic 发生的位置 | 宿主看到什么 |
| --- | --- |
| `command` 内部 | `PMPX_ERR_INTERNAL` → `pmpx` 以 `1` 退出 |
| `name` 或 `family` 内部 | `PANIC_MARKER` 哨兵值 |

panic 在边界处被捕获，因为跨越 `extern "C"` 展开栈是未定义行为。这个 trait 是同步的：没有
`async`，没有回调，没有运行时。

## 测试与检查清单

### 测试

```console
$ cargo test -p pmpx-plugin            # the contract crate
$ cargo test                            # your plugin, in-process
```

`Context::builder()` 手工构造一个 context，所以插件自己的测试可以精确构造它关心的场景——某个
命中的文件、某条钉住、某个特定的 `start_dir`——而不需要项目目录或 `dlopen`。

workspace 里还有参考资料：

| 路径 | 是什么 |
| --- | --- |
| `pmpx-plugin-starter` | 用来复制的模板 |
| `pmpx-plugin/src/context.rs` | 每一个 `Context` 字段，带文档 |
| `crates/pmpx-plugin/tests/` | 真实的 `dlopen` 端到端测试，以及进程内测试 |
| `crates/pmpx-plugin/tests/fixtures/toy-plugin` | 一个最小插件，构建成真正的 cdylib |

### 检查清单

- [ ] manifest 里的 `name` 等于 `PackageManager::name()`
- [ ] manifest 里的 `version` 等于 `Cargo.toml` 里的
- [ ] `abi` 等于 `pmpx-plugin` 依赖的 `PMPX_ABI_MAJOR`
- [ ] 真正的 lockfile 放在 `detect.strong`，manifest 放在 `detect.weak`
- [ ] 插件读取的每个文件都在 `[context] files` 里声明
- [ ] `command()` 除了它的参数什么都不碰
- [ ] 后端表达不了的动词返回 `PluginError::unsupported_verb`

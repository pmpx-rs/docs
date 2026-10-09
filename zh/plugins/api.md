# 插件 API 概览

契约 crate 是 [`pmpx-plugin`](https://crates.io/crates/pmpx-plugin)：**零依赖**，MSRV 1.82。
本页是它所暴露内容的地图。

## trait 与相关的类型

### `PackageManager`

插件实现的唯一 trait。

```rust
pub trait PackageManager {
    fn name(&self) -> &str;
    fn family(&self) -> Family;
    fn command(&self, ctx: &Context, verb: Verb, args: &[OsString])
        -> Result<CommandSpec, PluginError>;
}
```

| 方法 | 约定 |
| --- | --- |
| `name` | 必须等于 manifest 的 `plugin.name`。否则宿主拒绝加载。 |
| `family` | 这个后端所属的生态。也是 `.pmpx.toml` 里钉住所用的键。 |
| `command` | 纯映射。不碰文件、不碰环境、不跑进程。 |

::: warning `command()` 必须是纯映射
每次调用只用动词、参数和交给它的 `Context` 来回答——不碰文件、不碰环境、不跑进程。
:::

`name` 和 `family` 都不得触碰文件系统：它们在判定存在之前就被调用，而且像 `plugin ls` 这样的
展示命令可能为一个永远不会运行的插件调用它们。

### `Verb`

一个封闭的七元集合。封闭是刻意的——宿主表达不了的动词，就是没有任何插件会被问到的动词。

```rust
pub enum Verb { Install, Remove, Update, Run, Build, Test, Exec }
```

| 关联项 | 用途 |
| --- | --- |
| `Verb::ALL` | 所有变体，用于测试，以及询问插件它支持什么 |
| `Verb::to_abi` / `Verb::from_abi` | 线上传输用的数字，即 `PMPX_VERB_*` |
| `Verb::as_str` | CLI 里的写法：`"install"`、`"run"`…… |

### `CommandSpec`

插件的返回值：一个程序、它的参数，以及可选的运行位置。

```rust
pub struct CommandSpec {
    pub program: OsString,
    pub args: Vec<OsString>,
    pub cwd: Option<PathBuf>,
}

impl CommandSpec {
    pub fn new(program: impl Into<OsString>) -> Self;
    pub fn arg(self, arg: impl Into<OsString>) -> Self;
    pub fn args<I>(self, args: I) -> Self where I: IntoIterator<Item = impl Into<OsString>>;
    pub fn cwd(self, dir: impl Into<PathBuf>) -> Self;
}
```

`cwd: None` 意味着项目根目录。当后端必须在某个特定位置运行时——workspace 成员、包目录——就设置
它。

这些构建方法按值接收 `self` 并返回 `Self`，所以一条 spec 从左往右读：

```rust
CommandSpec::new("cargo").arg("add").args(args.iter())
```

### `Context`

宿主关于这次调用所知道的一切。只读，且仅在随它一起来的这次调用期间有效。

```rust
pub struct Context<'a> { /* … */ }

impl<'a> Context<'a> {
    pub fn has_matched(&self, name: &str) -> bool;
    pub fn was_pinned(&self) -> bool;
    pub fn pinned_for(&self, family: impl AsRef<str>) -> Option<&str>;
    pub fn file(&self, name: &str) -> Option<&[u8]>;
    pub fn file_str(&self, name: &str) -> Option<&str>;
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `project_root` | `&Path` | 探测到项目的位置 |
| `start_dir` | `&Path` | 人运行 `pmpx` 的位置——不是命令将运行的位置 |
| `matched` | 探测命中项 | 哪些标记让这个插件胜出 |
| `config_files` | `&[PathBuf]` | 读到的 `.pmpx.toml` 各层 |
| `pins` | `&Pins` | 项目的钉住，family → 插件 |
| `reason` | `Reason` | 这个插件为什么被选中 |
| `score` | 数值 | 选中它的那个得分 |

`file()` 和 `file_str()` 只对插件自己在 `[context] files` 里声明的名字给出答案。未声明的名字
返回 `None`——宿主不会去找。

`Context::builder()` 手工构造一个，插件自己的单元测试就是这样描述它关心的场景，而不需要真实的
项目目录。

### `Family`

一个**开放类型**，不是封闭枚举：已知生态有常量，未知生态通过 `Family::new` 扩展。

```rust
impl Family {
    pub const NODE:   Family;
    pub const RUST:   Family;
    pub const PYTHON: Family;
    pub const GO:     Family;
    pub const JVM:    Family;
    pub const DOTNET: Family;
    pub const PHP:    Family;
    pub const RUBY:   Family;

    pub fn new(name: impl Into<Cow<'static, str>>) -> Self;
    pub fn as_str(&self) -> &str;
}
```

比较和排序都按字符串进行。支持新生态的第三方插件既不需要改动契约 crate，也不需要 `pmpx` 发新
版本——这正是它不是一个枚举的全部原因。

### `PluginError`

```rust
pub enum PluginError { UnsupportedVerb, InvalidArgs, Other(..) }
```

| 构造函数 | 什么时候用 |
| --- | --- |
| `PluginError::unsupported_verb(verb)` | 后端对这个动词没有答案。**优先用它，而不是靠猜。** |
| `PluginError::invalid_args(..)` | 这些参数对这个后端来说没有意义 |
| `PluginError::other(..)` | 其他任何情况，附一条给人看的消息 |

::: tip 没有答案也是一种答案
`unsupported_verb` 不是失败——它是信息。正是它让 `pmpx exec` 可以回退到自己执行命令，也正是它让
`pmpx build` 带着解释以 `2` 退出，而不是跑一个看起来合理但其实错误的东西。
:::

## 日志、包装层与裸 ABI

### 日志宏

```rust
pmpx_plugin::debug!("…");
pmpx_plugin::info!("…");
pmpx_plugin::warn!("…");
pmpx_plugin::error!("…");
```

它们到达宿主，宿主加上插件的 id 并决定打印什么——所以无论插件记什么日志，`--json` 都保持可解析。
没有宿主时（插件自己的 `cargo test`），它们回退到 stderr。

| 模块项 | 用途 |
| --- | --- |
| `debug::Level` | 四个级别 |
| `debug::wants(level)` | 是否会有东西被打印——用来跳过昂贵的格式化 |
| `debug::emit(..)` | 这些宏的实现，用于自定义路径 |
| `debug::context()` | 把整个 context 作为一行打印 |

### `export!` 与 shell

```rust
pmpx_plugin::export!(create);
```

**只写一次**，写在生成的包装 crate 里——不是插件 crate 里。包装层才会变成 cdylib；插件保持为
普通 rlib，`cargo test` 可以直接跑它。

| 项 | 作用 |
| --- | --- |
| `export!` | 生成入口符号和能力表 |
| `shell` | ABI 垫片：字符串生命周期、`catch_unwind`、能力协商 |
| `abi` | 线上格式，从 `pmpx-plugin-abi` 再导出 |
| `dispatch`, `guard` | 垫片调用的插件侧辅助函数 |
| `PANIC_MARKER`, `BUILD_RUSTC`, `BUILD_TARGET` | 报告给宿主的哨兵值和构建元数据 |

### `pmpx-plugin-abi`

安全层底下的裸 C ABI——`#[repr(C)]` 表和普通数字，`no_std` 且零依赖，刻意做成可以手工翻译的
形式，这样插件也可以用 C、Zig 或 Go 写。

写 Rust 插件不需要它。这里记录它，是因为它定义了边界处“兼容”的含义：

| 项 | 含义 |
| --- | --- |
| `PMPX_ABI_MAJOR` | 版本闸门，当前为 `3` |
| `PMPX_ENTRY_SYMBOL` | 宿主查找的符号 |
| `PMPX_MAX_ITEMS` | 任何表和任何参数列表的上限 |
| `PMPX_OK`, `PMPX_ERR_*`, `PMPX_VERB_*`, `PMPX_REASON_*`, `PMPX_LEVEL_*` | 那些数字 |
| `PMPX_KEY_*`, `PMPX_CAP_*`, `PMPX_KEYS`, `PMPX_CAPS`, `PMPX_REQUIRED_CAPS` | context 的键和能力名称 |

::: details 不存在与空值的区别，以及边界上的 panic
这一层有两条规则，塑造了它上面的一切：

- **不存在和空是不同的。** 空指针意味着宿主在那个键下面什么都没有；非空指针但长度为零是空值。
- **未知不是错误，两个方向都是如此。** 宿主对不认识的键回答 `absent`；插件对不认识的动词必须
  回答 `PMPX_ERR_UNSUPPORTED_VERB`。

内存由分配它的一方释放，借用视图只在随它一起来的这次调用期间有效，panic 绝不能越过
`extern "C"`。
:::

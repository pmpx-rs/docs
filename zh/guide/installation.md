# 安装

## 用 cargo

```bash
cargo install pmpx
```

二进制名字是 `pmpx`。这是唯一在 Rust 支持的所有平台上都能用的方式，因为它从源码构建。

## 预编译包

每个 release 都会附带 Linux、Windows 的 `x86_64` 包，以及 macOS 的两种架构。安装脚本会下载对
应本机的那个，用 release 的 `SHA256SUMS` 校验，然后安装。

::: code-group

```bash [Linux / macOS]
curl -LsSf https://pmpx.dev/install.sh | sh
```

```powershell [Windows]
irm https://pmpx.dev/install.ps1 | iex
```

```bash [cargo-binstall]
cargo binstall pmpx
```

:::

### 装到哪里

这些脚本只写**一个文件**，不动 `PATH`，也不动你的 shell 配置。

| 平台 | 目录 |
| --- | --- |
| Linux / macOS | `~/.local/bin` |
| Windows | `%USERPROFILE%\.pmpx\bin` |

::: warning `pmpx: command not found`
三个脚本都不会改你的 shell 配置，所以这个目录必须在你的 `PATH` 里——否则就得用完整路径调用二进
制。这是"装成功了却看起来像装失败了"最常见的原因。
:::

### 镜像与版本钉住

三个脚本都从环境变量读取这些设置：

| 变量 | 作用 |
| --- | --- |
| `PMPX_INSTALL_DIR` | 装到别的位置 |
| `PMPX_VERSION` | 安装指定版本，而不是最新版 |
| `PMPX_BASE_URL` | 从镜像下载，而不是 `github.com` |

没有预编译包的平台不算失败——`cargo install pmpx` 在 Rust 支持的任何地方都能从源码构建。

## 验证安装

```console
$ pmpx --version
pmpx {{pmpx.version}}
```

然后看看它能看见什么。在还没有装任何插件的情况下，这是预期输出：

```console
$ pmpx info
Start         /home/you/code/some-repo
Project root  /home/you/code/some-repo
Walk-up       1 directory, stopped because: .git
Project config  (none)

Installed plugins  (none)

No plugin is installed, so pmpx cannot detect a project. Install one with
`pmpx plugin add <name>`.
```

::: tip 这条提示是预期的
它就是那条*“至少一个插件”*要求的具体表现，不是安装坏了。下一页解决它。
:::

## 环境要求

| | |
| --- | --- |
| 从源码构建 | Rust **1.88+** |
| 运行 | 至少一个插件——见[插件与商店](/zh/reference/plugins) |
| 编写插件 | Rust **1.82+**，用于契约 crate |

## 更新

```console
$ pmpx self update --check         # what is available; changes nothing
$ pmpx self update                 # replace this binary with the newest release
$ pmpx self update --version 0.1.0 # or a specific one, which is also how you roll back
```

任何时候都不会自动检查：没有后台检查，启动时也没有*“有新版本可用”*的提示条。

### 它什么时候会拒绝

只有 cargo 不管理的安装方式才能替换自己——`cargo install` 自己记录着往磁盘上放了什么，所以这种
方式装出来的 `pmpx` 会提示你改用 `cargo install pmpx --force`。

::: details 校验和能证明什么，不能证明什么
替换任何东西之前，下载内容都会用 release 的 `SHA256SUMS` 校验；不匹配就停在那里，正在运行的二
进制不动。

这**不是签名**。校验和文件与压缩包来自同一个地方，所以它证明的是字节完整到达，而不是谁构建的。
把它当作对下载截断或镜像损坏的防护，而不是对 release 被篡改的防护。

剩下的规则——哪些参数可以组合、Windows 上如何替换正在运行的二进制——见[自更新](/zh/reference/self-update)。
:::

## 卸载

没有 `pmpx uninstall`，因为没有什么需要拆解的：一个二进制、一个插件目录、一个配置目录。

```bash
# Linux / macOS
rm "$(command -v pmpx)"
rm -rf ~/.pmpx ~/.config/pmpx

# Windows
Remove-Item "$env:USERPROFILE\.pmpx" -Recurse -Force
Remove-Item "$env:APPDATA\pmpx" -Recurse -Force
```

如果是用 cargo 安装的，请用 `cargo uninstall pmpx` 而不是删文件，这样 cargo 的记录才是对的。

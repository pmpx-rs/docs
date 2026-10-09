# 自更新

```console
$ pmpx self update --check         # what is available; changes nothing
$ pmpx self update                 # replace this binary with the newest release
$ pmpx self update --version 0.1.0 # or a specific one, which is also how you roll back
$ pmpx self update --force         # reinstall even when this version is the one running
```

任何时候都不会自动检查。没有后台检查，启动时也没有*“有新版本可用”*的提示条——更新只在你要它
发生时才发生。

## 只适用于 cargo 不管理的安装方式

### 决定权在记录，不在目录

`cargo install` 自己记录着往磁盘上放了什么。背着 cargo 替换那个文件会让 `cargo install --list`
和现实不符，所以这样装出来的 `pmpx` 会被提示改用 cargo：

```console
$ pmpx self update
pmpx: this binary is managed by cargo. Run `cargo install pmpx --force` instead.
```

::: warning cargo 管理的二进制不能自更新
正因如此 `pmpx self update` 会拒绝；请改用 `cargo install pmpx --force`。
:::

`cargo binstall`、手动解压的压缩包和 `cargo install` 最终都落在同一个地方；只有前两者能自更新。

## 校验和能证明什么

::: details 校验和证明了什么、没证明什么
下载内容会**在替换任何东西之前**对照 release 的 `SHA256SUMS` 校验。不匹配就当场停下，正在运行
的二进制不受影响。

这**不是签名**。校验和文件与压缩包来自同一个地方，所以它证明的是字节完整到达——而不是谁构建了
它们。把它当成对下载被截断或镜像损坏的防护，而不是对 release 被投毒的防护。
:::

## 回滚

### `--version` 就是回滚命令

`--version` 的意思不是“降级”，而是“安装这一个”。因此它就是回滚命令：

```console
$ pmpx self update --version 0.6.2
```

## 标志组合

`--check` 是在回答问题，所以它不能和另外两个组合：

| 组合 | 是否允许 | 原因 |
| --- | --- | --- |
| 只写 `--check` | ✅ | *“有什么可用？”* |
| `--check --version 0.1.0` | ❌ | `--version` 已经指明了要查看哪个 release |
| `--check --force` | ❌ | `--force` 是要求重装；而 `--check` 什么都不改 |
| `--version` + `--force` | ✅ | 重装那个指定的版本 |

## 替换正在运行的二进制

在 Windows 上，可执行文件不能在运行期间删掉自己。更新会把新二进制写到一个 `.new` 文件，在平台
允许的范围内把它换到位，并留下一个 `.old`。

这个残留会在**下一次**启动时而不是这一次被清理掉，而且是静默的，因为删不掉它只意味着*“下次
再说”*。

## 环境变量覆盖

下载 release 时遵循[安装脚本](/zh/guide/installation)里的镜像变量：

| 变量 | 作用 |
| --- | --- |
| `PMPX_BASE_URL` | 从镜像获取 release |
| `PMPX_VERSION` | 要安装的版本，等价于 `--version` |

## 不工作时

| 现象 | 原因 |
| --- | --- |
| *“managed by cargo”* | 安装记录这么说的；用 `cargo install pmpx --force` |
| 校验和不匹配 | 下载被截断，或镜像提供了别的东西。没有替换任何内容。 |
| 这个平台没有压缩包 | 改为自行构建：`cargo install pmpx` |
| GitHub 返回 `403` | 触发限流，在共享的 CI runner 上很常见 |

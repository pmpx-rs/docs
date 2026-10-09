# 简介

`pmpx` 是**项目里各种包管理器的统一命令入口**。

它读取仓库里本来就有的文件，判断这个仓库归哪个包管理器管，把一组固定的动词翻译成那个工具真正
认的写法，然后把它拉起来。不需要先写配置文件，也没有任何要初始化的东西。

::: tip 只想先试试？
[安装 pmpx](/zh/guide/installation)，再装一个插件，然后继续跑你原本就在跑的那条命令。
:::

```console
$ pmpx install serde            # a Rust project    → cargo add serde
$ pmpx install lodash           # a frontend repo   → pnpm add lodash
$ pmpx test -- --nocapture      #                   → cargo test --nocapture
$ pmpx exec tsc --noEmit        #                   → pnpm exec tsc --noEmit
```

同样这四条命令，在四个不同的仓库里，落到三种不同的工具上。

## 它解决的问题

在这个目录里，该跑哪条命令？

```console
$ ls
Cargo.toml  package.json  pnpm-lock.yaml  pnpm-workspace.yaml
```

这里该跑 `cargo build` 还是 `pnpm build`？你的 shell 并不知道，所以要么你记得，要么你去翻一
下。一周里你碰到的每个仓库都得来一遍，每个需要被告知的同事也得来一遍。

`pmpx` 依据项目里本来就有的证据，机械地把这个问题一次答清：

```console
$ pmpx
Project root  /home/you/code/some-repo
Family        node
Plugin        pnpm (score 220)

Use `pmpx info` to see every candidate and score.
```

## 不同之处

### 一套统一的动词表

`install`、`remove`、`run`、`build`、`test`、`update` 和 `exec` 在哪里都是同一个意思。变的只是
翻译结果：

| 你输入的命令 | Node (pnpm) | Rust (cargo) |
| --- | --- | --- |
| `pmpx install` | `pnpm install` | `cargo fetch` |
| `pmpx install lodash` | `pnpm add lodash` | `cargo add lodash` |
| `pmpx remove lodash` | `pnpm remove lodash` | `cargo remove lodash` |
| `pmpx run dev` | `pnpm run dev` | `cargo run dev` |
| `pmpx build` | `pnpm build` | `cargo build` |
| `pmpx test` | `pnpm test` | `cargo test` |
| `pmpx update` | `pnpm update` | `cargo update` |
| `pmpx exec tsc` | `pnpm exec tsc` | *（没有答案——pmpx 自己执行）* |

### 二进制里没有任何后端

每个生态都是一个插件，运行时 `dlopen` 进来。二进制里不打包任何插件，所以体积保持很小，插件也
不必和宿主用同一个编译器构建。

### 探测不加载任何插件代码

打分只读取插件声明的 manifest，别的什么都不读。在从未装过插件的仓库里运行 `pmpx`，不会执行任何
第三方代码。

### 平局由你裁决

全局配置里的两个优先级数组决定什么算“混合项目”。默认是 Node 优先，但那只是默认值，不是规则
——见[后端解析](/zh/guide/resolution)。

## 它不做什么

`pmpx` 只写自己的文件：`~/.pmpx/**`、全局配置，以及在你主动要求时的项目 `.pmpx.toml`。**你的
项目里没有缓存文件**，因为缓存省下的时间不到一毫秒，代价却是一个被弄脏的工作区。

它不是代理，不是镜像，也不是 registry 客户端。它不读 `~/.npmrc`、`~/.cargo/config.toml`、
`~/.yarnrc.yml` 或任何其他工具的配置，也没有任何形式的 registry 功能。这些都在你的 shell 或各工具
自己的配置里设置；`pmpx` 拉起进程时原样继承环境。它刻意从不触碰的完整清单见[常见问题](/zh/faq)。

## 环境要求

- **Rust 1.88+** —— 用于从源码构建。
- **至少一个插件** —— 没有插件时 `pmpx` 什么都探测不到。这是刻意的：内置后端就意味着一个你想
  更新它就得更新 `pmpx` 的后端。

## 接下来看什么

- [安装](/zh/guide/installation) —— 先装二进制，再装一个插件。少一个都不行。
- [快速上手](/zh/guide/quick-start) —— 安装、问一下这个目录是什么、跑点什么。
- [自动探测原理](/zh/guide/detection) —— 打分机制，以及平局为什么会存在。

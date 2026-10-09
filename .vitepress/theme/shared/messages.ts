/** The hero's copy, in both languages. The animation itself carries no words. */

export type Locale = 'en' | 'zh'

export interface Feature {
  icon: string
  title: string
  details: string
}

export interface Messages {
  termTitle: string
  /** Screen-reader description of the animation, which is otherwise unreadable. */
  termAria: string
  heroName: string
  heroText: string
  heroTagline: string
  heroLead: string
  getStarted: string
  readDetection: string
  installTitle: string
  installNote: string
  copy: string
  copied: string
  features: Feature[]
  closingTitle: string
  closingText: string
  closingCta: string
  closingAlt: string
}

const en: Messages = {
  termTitle: 'pmpx — detection',
  termAria:
    'An animation: below the fixed command pmpx, one verb at a time is typed and erased — install, run, test — while three detected project types type the same verb in step. Node.js resolves to pnpm, Rust to cargo, and Go to go.',
  heroName: 'pmpx',
  heroText: 'One command surface. Every project.',
  heroTagline:
    'Stop remembering whether this repository wants pnpm or cargo. pmpx reads the files a project already has, decides which package manager owns it, and runs the real tool.',
  heroLead:
    'Zero backends in the binary. Every ecosystem is a plugin, loaded at runtime — install only the ones you need.',
  getStarted: 'Get started',
  readDetection: 'How detection works',
  installTitle: 'Install',
  installNote:
    'Prebuilt archives for Linux, macOS and Windows ship with every release. Windows users can run install.ps1 instead.',
  copy: 'Copy',
  copied: 'Copied',
  features: [
    {
      icon: 'detect',
      title: 'Detects the project, not the other way round',
      details:
        'Lockfiles, workspace files and shape markers score each installed backend against the project root. Nothing to initialise, no config file to write first.',
    },
    {
      icon: 'translate',
      title: 'One vocabulary of verbs',
      details:
        'install, remove, run, build, test, update, exec — the same seven in every repository, translated per backend into the command that ecosystem actually spells.',
    },
    {
      icon: 'plugin',
      title: 'A real plugin system',
      details:
        'Backends are cdylibs, dlopen-ed at runtime. The binary ships none, and a plugin need not share your rustc — the ABI is versioned and checked.',
    },
    {
      icon: 'tiebreak',
      title: 'Resolvable and overridable',
      details:
        'Ties break on two priority arrays you edit, per family and per plugin. A .pmpx.toml pins one backend for a repository, collected upward so a monorepo can override per package.',
    },
    {
      icon: 'exec',
      title: 'An escape hatch that always works',
      details:
        'When a backend has no answer for exec, pmpx falls back to running the command itself. Every other verb reports an explicit error instead of guessing.',
    },
    {
      icon: 'json',
      title: 'Built to be scripted',
      details:
        '--json turns a run into one JSON object per line on stdout, with the backend’s own output moved to stderr so the stream stays parseable.',
    },
  ],
  closingTitle: 'Ready when your repo is',
  closingText:
    'Install the binary, add a plugin, and run the same command you have always run.',
  closingCta: 'Read the quick start',
  closingAlt: 'Browse the crates',
}

const zh: Messages = {
  termTitle: 'pmpx — 自动探测',
  termAria:
    '一段动画：固定的命令 pmpx 后面，依次逐字打出并删除动词 —— install、run、test —— 下方三种被探测到的项目类型同步打出同一个动词。Node.js 解析为 pnpm，Rust 解析为 cargo，Go 解析为 go。',
  heroName: 'pmpx',
  heroText: '一条命令，所有项目。',
  heroTagline:
    '不用再记这个仓库到底该跑 pnpm 还是 cargo。pmpx 读取项目里本来就有的文件，判断谁才是它的包管理器，然后调用真正的工具。',
  heroLead:
    '二进制里不内置任何后端。每个生态都是一个插件，运行时加载 —— 只装你需要的那几个。',
  getStarted: '开始使用',
  readDetection: '探测是怎么工作的',
  installTitle: '安装',
  installNote:
    '每个 release 都附带 Linux、macOS 与 Windows 的预编译包。Windows 也可以用 install.ps1。',
  copy: '复制',
  copied: '已复制',
  features: [
    {
      icon: 'detect',
      title: '探测项目，而不是让你迁就它',
      details:
        '用 lockfile、workspace 文件和形态标记给每个已装后端打分。不需要初始化，也不需要先写配置文件。',
    },
    {
      icon: 'translate',
      title: '一套动词词汇表',
      details:
        'install、remove、run、build、test、update、exec —— 七个动词在所有仓库里都一样，由后端翻译成该生态真正的写法。',
    },
    {
      icon: 'plugin',
      title: '真正的插件系统',
      details:
        '后端是运行时 dlopen 的 cdylib。二进制里一个都不带，插件也不必和你的 rustc 同版本 —— ABI 有版本号并且会被校验。',
    },
    {
      icon: 'tiebreak',
      title: '可解析、可覆盖',
      details:
        '平局由两份优先级数组决出，按 family 和按插件各一份。.pmpx.toml 可以给仓库钉死一个后端，并且逐层向上收集，monorepo 能在子包里覆盖。',
    },
    {
      icon: 'exec',
      title: '永远可用的逃生口',
      details:
        '当后端对 exec 没有答案时，pmpx 直接自己执行这条命令。其他动词则明确报错，而不是猜测。',
    },
    {
      icon: 'json',
      title: '为脚本而生',
      details:
        '--json 把一次运行变成 stdout 上每行一个 JSON 对象，后端自身的输出被移到 stderr，流始终可解析。',
    },
  ],
  closingTitle: '你的仓库已经准备好了',
  closingText: '装上二进制，添加一个插件，然后继续跑你一直在跑的那条命令。',
  closingCta: '阅读快速上手',
  closingAlt: '浏览 crate',
}

export const messages: Record<Locale, Messages> = { en, zh }

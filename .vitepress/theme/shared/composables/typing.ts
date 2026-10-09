/** The animation's vocabulary. Shared by the terminal card and its branches. */

/** The three verbs the hero cycles through, in order. */
export const VERBS = ['install', 'run', 'test'] as const

export type Verb = (typeof VERBS)[number]

/** What each ecosystem's manager would actually be asked to do. */
export const COMMANDS: Record<Verb, string> = {
  install: 'install',
  run: 'run dev',
  test: 'test',
}

/**
 * The order the sentences are typed in.
 *
 * Built from `COMMANDS` rather than written out again, so adding a verb is a one-line change and
 * the order is the one in `VERBS`.
 */
export const SENTENCES: string[] = VERBS.map(verb => COMMANDS[verb])

export type TypingPhase = 'typing' | 'paused' | 'deleting'

export interface Branch {
  /** `node` | `rust` | `go` -- also the class suffix that picks the accent colour. */
  id: string
  /** What the project is, as a person would say it. */
  ecosystem: string
  /** Which installed plugin answers. */
  manager: string
}

/**
 * Per-character delays. Typing is slower than deleting, which is what reads as human.
 *
 * `afterCleared` is the only moment the spotlight is allowed to move -- the line is empty, so a
 * change of subject cannot contradict anything on screen. It doubles as the pause between
 * sentences, which is why it is long enough to read as a beat rather than a glitch.
 */
export const TIMING = {
  type: [62, 132] as const,
  delete: [26, 52] as const,
  afterComplete: 1100,
  afterCleared: 420,
}

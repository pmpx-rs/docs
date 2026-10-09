import type { Ref } from 'vue'
import type { TypingPhase } from './typing'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { TIMING } from './typing'

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
function between([min, max]: readonly [number, number]) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export interface Typing {
  /** The part of the sentence that is currently visible. */
  displayed: Ref<string>
  /** Where the loop is, for the caret's blink. */
  phase: Ref<TypingPhase>
}

export interface CyclerOptions {
  /**
   * Called once a sentence has been deleted and before the next one is chosen.
   *
   * This is the only correct moment to change what is being typed. A separate timer for the
   * spotlight looks fine and is wrong: it fires mid-word, and since the current sentence always
   * finishes first, the page then shows a verb that disagrees with the highlighted row for a
   * second and a half.
   */
  onCycleEnd?: () => void
}

/**
 * Types each sentence of `sentences` in turn: type it, hold it, backspace it, move to the next.
 *
 * This is the hero's **only** animation. One instance drives every line on screen -- the root's
 * verb and all three branches -- because they all display the same string. Running a typewriter
 * per line was the earlier design and it was wrong twice over: each instance drew its own random
 * per-character delays, so the lines visibly drifted apart within a second, and four loops doing
 * identical work is three more than the job needs.
 *
 * A sentence is always finished before the next begins, so the reader never sees one word
 * dissolve into another.
 */
export function useSentenceCycler(
  sentences: Ref<string[]>,
  active: Ref<boolean>,
  options: CyclerOptions = {},
): Typing {
  const displayed = ref('')
  const phase = ref<TypingPhase>('typing')
  const total = () => Math.max(1, sentences.value.length)

  let run = 0

  /** One pass: type it out, hold, delete it, settle. Resolves false when cancelled. */
  async function cycle(value: string, token: number): Promise<boolean> {
    for (let i = 1; i <= value.length; i++) {
      if (token !== run)
        return false
      displayed.value = value.slice(0, i)
      phase.value = 'typing'
      await wait(between(TIMING.type))
    }

    if (token !== run)
      return false
    phase.value = 'paused'
    await wait(TIMING.afterComplete)
    if (token !== run)
      return false

    phase.value = 'deleting'
    for (let i = value.length - 1; i >= 0; i--) {
      if (token !== run)
        return false
      displayed.value = value.slice(0, i)
      await wait(between(TIMING.delete))
    }

    phase.value = 'typing'
    await wait(TIMING.afterCleared)
    return token === run
  }

  function loop() {
    const token = ++run
    void (async () => {
      // Indexed rather than iterated: the list can change under us, and whatever sits at the
      // current index is what belongs on screen next.
      let index = 0
      while (token === run) {
        if (!active.value)
          return
        const list = sentences.value
        if (list.length === 0) {
          await wait(120)
          continue
        }

        const value = list[index % list.length]
        if (!(await cycle(value, token)))
          return

        // The blank moment between sentences: the line is empty, so this is where the spotlight
        // can move without contradicting anything already on screen.
        index = (index + 1) % total()
        options.onCycleEnd?.()
      }
    })()
  }

  /** End the loop and show the first sentence in full. What a reduced-motion reader sees. */
  function complete() {
    run++
    displayed.value = sentences.value[0] ?? ''
    phase.value = 'paused'
  }

  watch(active, isActive => (isActive ? loop() : complete()))

  onMounted(() => {
    // Not before this: during SSR `displayed` must stay empty, or hydration sees text the server
    // never sent.
    if (active.value)
      loop()
    else complete()
  })

  onBeforeUnmount(() => {
    run++
  })

  return { displayed, phase }
}

/**
 * Whether the reader has asked for less motion.
 *
 * Read only on the client, and only after mount: `matchMedia` does not exist during SSR, and
 * deciding this during render would change the markup the server sent.
 */
export function useReducedMotion() {
  const reduced = ref(false)

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = query.matches
    const onChange = (event: MediaQueryListEvent) => (reduced.value = event.matches)
    query.addEventListener('change', onChange)
    onBeforeUnmount(() => query.removeEventListener('change', onChange))
  })

  return { reduced }
}

/**
 * Pauses the hero while it cannot be seen.
 *
 * Two independent reasons count as "not visible": scrolled out of the viewport, or the tab
 * hidden. Both are tracked, because a backgrounded tab also stops firing IntersectionObserver
 * callbacks in some browsers.
 */
export function useVisibility(element: Ref<HTMLElement | null>) {
  const onScreen = ref(false)
  const tabVisible = ref(true)
  const visible = ref(false)

  let observer: IntersectionObserver | null = null

  function sync() {
    visible.value = onScreen.value && tabVisible.value
  }

  onMounted(() => {
    // No IntersectionObserver (very old browser, or a test environment): run unconditionally
    // rather than showing a permanently blank terminal.
    if (typeof IntersectionObserver === 'undefined') {
      onScreen.value = true
      sync()
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        onScreen.value = entries.some(entry => entry.isIntersecting)
        sync()
      },
      { threshold: 0.15 },
    )
    if (element.value)
      observer.observe(element.value)

    tabVisible.value = !document.hidden
    sync()
  })

  function onVisibilityChange() {
    tabVisible.value = !document.hidden
    sync()
  }

  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))

  onBeforeUnmount(() => {
    observer?.disconnect()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { visible }
}

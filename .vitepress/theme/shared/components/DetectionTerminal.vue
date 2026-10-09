<script setup lang="ts">
import type { Branch } from '../composables/typing'
import { computed, ref } from 'vue'
import { useReducedMotion, useSentenceCycler, useVisibility } from '../composables/animation'
import { SENTENCES } from '../composables/typing'
import { useLocale } from '../composables/useLocale'
import BranchLine from './BranchLine.vue'

const { t } = useLocale()

/**
 * Three project types, and the plugin each one resolves to.
 *
 * The manager names are the ones in the plugin store, so the animation shows exactly what
 * `pmpx plugin ls` would report for these three repositories.
 */
const branches: Branch[] = [
  { id: 'node', ecosystem: 'Node.js', manager: 'pnpm' },
  { id: 'rust', ecosystem: 'Rust', manager: 'cargo' },
  { id: 'go', ecosystem: 'Golang', manager: 'go' },
]

const root = ref<HTMLElement | null>(null)
const { visible } = useVisibility(root)
const { reduced } = useReducedMotion()

/**
 * Whether the animation should run at all.
 *
 * A reduced-motion reader gets the whole table already filled in and the spotlight parked on the
 * first branch -- which still communicates the fork, without the typing.
 */
const animating = computed(() => visible.value && !reduced.value)

/**
 * Which branch is highlighted. It is the single index the rest of the hero is derived from: the
 * sentence being typed is `SENTENCES[spotlight]`, which for `run` is literally `run dev` -- the
 * string that branch would run. So one sentence serves the root line and all three branches,
 * rather than each line having its own idea of what is happening.
 */
const spotlight = ref(0)

const sentences = computed(() => SENTENCES)
const { displayed, phase } = useSentenceCycler(sentences, animating, {
  // Moved between sentences, never during one. Firing on a timer looked equivalent and was not:
  // it lands mid-word, and because the current sentence always finishes first, the page would
  // briefly show a command that contradicted the highlighted row.
  onCycleEnd: () => {
    spotlight.value = (spotlight.value + 1) % branches.length
  },
})
</script>

<template>
  <div ref="root" class="term">
    <div class="term__bar">
      <span class="term__lights" aria-hidden="true">
        <i class="term__light term__light--r" />
        <i class="term__light term__light--y" />
        <i class="term__light term__light--g" />
      </span>
      <span class="term__title">{{ t.termTitle }}</span>
      <span class="term__count" aria-hidden="true">{{ branches.length }} plugins</span>
    </div>

    <div class="term__body">
      <!--
        One sentence for assistive tech, because the visual is a set of characters that carry no
        meaning read aloud. The tree below is hidden from the tree representation entirely.
      -->
      <p class="sr-only">
        {{ t.termAria }}
      </p>

      <div class="term__tree" aria-hidden="true">
        <!--
          The wordmark is pinned and only the verb types. Animating the whole line would make the
          one fixed thing on the page -- the name of the tool -- flicker in and out, which is the
          opposite of what an identity should do.
        -->
        <div class="term__root">
          <span class="term__tree-glyph">├─ </span>
          <span class="term__wordmark">pmpx</span><span class="term__verb">{{ displayed }}</span><span class="term__caret" :class="`term__caret--${phase}`" />
        </div>

        <div role="list">
          <BranchLine
            v-for="(branch, i) in branches"
            :key="branch.id"
            :branch="branch"
            :displayed="displayed"
            :phase="phase"
            :active="i === spotlight"
            :last="i === branches.length - 1"
          />
        </div>
      </div>
    </div>

    <!--
      Deliberately empty.

      Three things have lived here: `pmpx install → pnpm install`, which only repeated what the
      tree above already shows; then the matched evidence and score; then the same content
      cross-faded. The textual changes could not be made to read as one motion -- a swap that
      lands on a different step than the row highlight reads as the strip jumping two or three
      times, and tuning the fade only moved which step was visible.

      So the bar stays as a shape, because the terminal needs a footer to look finished, and
      carries nothing until there is something that does not fight the spotlight.
    -->
    <div class="term__foot" aria-hidden="true" />
  </div>
</template>

<style scoped>
.term {
  position: relative;
  border: 1px solid var(--pmpx-term-border);
  border-radius: var(--pmpx-radius-lg);
  background: linear-gradient(160deg, var(--pmpx-term-bg-2), var(--pmpx-term-bg));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 28px 60px -28px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 0 90px -30px var(--pmpx-glow);
  overflow: hidden;
  font-family: var(--pmpx-mono);
  color: var(--pmpx-term-text);
}

/* A faint sweep of the brand colour, so the panel does not read as flat black. */
.term::before {
  content: '';
  position: absolute;
  inset: -40% -10% auto -10%;
  height: 70%;
  background: radial-gradient(
    60% 100% at 50% 0%,
    color-mix(in srgb, var(--pmpx-primary-1) 28%, transparent),
    transparent 70%
  );
  pointer-events: none;
}

.term__bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--pmpx-term-border);
  background: rgba(255, 255, 255, 0.015);
}

.term__lights {
  display: inline-flex;
  gap: 6px;
  flex: none;
}

.term__light {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  display: block;
}

.term__light--r {
  background: #ff5f57;
}
.term__light--y {
  background: #febc2e;
}
.term__light--g {
  background: #28c840;
}

.term__title {
  font-size: 12px;
  color: var(--pmpx-term-muted);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.term__count {
  margin-left: auto;
  flex: none;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--pmpx-term-muted);
  border: 1px solid var(--pmpx-term-border);
  background: rgba(255, 255, 255, 0.03);
}

.term__body {
  position: relative;
  padding: 22px 20px 24px;
  /* Fixed, so the panel cannot resize as values grow and shrink. */
  min-height: 208px;
}

.term__tree {
  font-size: 14px;
  line-height: 1.95;
  white-space: pre;
}

.term__root {
  position: relative;
  padding-block: 3px;
  font-size: 1.06em;
}

.term__tree-glyph {
  color: var(--pmpx-term-dim);
}

/*
  The gap between the wordmark and the verb is a margin, not a text node.
  A literal space here is unreliable: Vue condenses whitespace between elements, so the rendered
  line came out as `pmpxinstall`. A margin cannot be condensed away.
*/
.term__wordmark {
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  padding-right: 0.6ch;
}

/* The typed verb, in the brand colour, so the moving part is visibly the verb. */
.term__verb {
  font-weight: 600;
  color: var(--pmpx-primary-2);
  text-shadow: 0 0 24px color-mix(in srgb, var(--pmpx-primary-2) 60%, transparent);
}

.term__caret {
  display: inline-block;
  width: 0.55em;
  height: 1.02em;
  margin-left: 1px;
  vertical-align: -0.16em;
  background: var(--pmpx-primary-2);
  animation: term-caret 1.05s step-end infinite;
}

.term__caret--typing,
.term__caret--deleting {
  opacity: 1;
  animation: none;
}

@keyframes term-caret {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.term__foot {
  /*
    An empty bar.

    It is here because the terminal needs a footer to look finished, and it carries nothing
    while there is nothing worth putting in it -- see the template comment for what has been
    tried and removed. The height is fixed rather than derived from content, because the text
    that used to live here changed length and visibly grew and shrank the whole panel.
  */
  height: 40px;
  border-top: 1px solid var(--pmpx-term-border);
  background: rgba(0, 0, 0, 0.25);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 560px) {
  .term__body {
    padding: 16px 14px 18px;
    min-height: 0;
  }

  .term__tree {
    font-size: 12.5px;
    line-height: 1.8;
    white-space: normal;
  }
}
</style>

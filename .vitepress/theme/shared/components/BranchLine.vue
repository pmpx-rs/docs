<script setup lang="ts">
import type { Branch, TypingPhase } from '../composables/typing'

defineProps<{
  branch: Branch
  /**
   * The text currently visible, and where the typewriter is.
   *
   * Passed down rather than computed here: there is one typewriter for the whole hero (see
   * `useSentenceCycler`), so every line shows the same string at the same instant. A typewriter
   * per line looked synchronised for about a second and then drifted.
   */
  displayed: string
  phase: TypingPhase
  active: boolean
  /** The last row closes the trunk with `└─`; every other row tees off it with `├─`. */
  last: boolean
}>()
</script>

<template>
  <!--
    A fixed character grid rather than flexbox.

    The tree column is `│  ` plus a three-cell connector, and the root row is `├─ ` plus three
    cells of its own -- so the ecosystem names line up under one another by construction.
    Nothing here is measured, so nothing can shift while a value is typed or deleted at a
    different length; the cost is hanging indents on narrow screens, which the stylesheet trades
    back at the bottom.
  -->
  <div class="branch" :class="[`branch--${branch.id}`, { 'is-active': active }]" role="listitem">
    <span class="branch__tree" aria-hidden="true">{{ last ? '│  └─ ' : '│  ├─ ' }}</span>
    <span class="branch__eco">{{ branch.ecosystem }}</span>
    <span class="branch__arrow" aria-hidden="true"> → </span>
    <span class="branch__mgr">{{ branch.manager }}</span>
    <span class="branch__cmd">
      <span class="typed">{{ displayed }}</span><span class="caret" :class="`caret--${phase}`" aria-hidden="true" />
    </span>
  </div>
</template>

<style scoped>
.branch {
  display: block;
  padding-block: 3px;
  font-family: var(--pmpx-mono);
  font-size: 0.95em;
  white-space: pre;
  --accent: var(--pmpx-primary-2);
  /* The transition itself lives on the two state rules below, so the focused and unfocused
     declarations each carry the full pair. */
}

/* The per-ecosystem accent lives on the row, so both the manager and its verb can read it. */
.branch--node {
  --accent: var(--pmpx-node);
}

.branch--rust {
  --accent: var(--pmpx-rust);
}

.branch--go {
  --accent: var(--pmpx-go);
}

/* The trunk and the tees stay uniformly dim: they are structure, not content. */
.branch__tree {
  color: var(--pmpx-term-dim);
}

.branch__eco {
  color: var(--pmpx-term-muted);
  transition: color 0.45s ease;
}

.branch__arrow {
  color: var(--pmpx-term-dim);
}

/* Padding rather than a min-width, so the gap never collapses when the grid is given up. */
.branch__mgr {
  padding-right: 1ch;
  color: var(--pmpx-term-text);
  transition: color 0.45s ease;
}

.branch__cmd {
  display: inline-block;
  min-width: 18ch;
  color: var(--pmpx-term-text);
  transition: color 0.45s ease;
}

/*
  Focus. Without it, three branches typing in lockstep read as three things happening at once;
  with it, the eye is told which one the line above is about.

  The unfocused rows are *desaturated*, not merely faded. Colour is what carried the emphasis
  before -- every row had its full accent, so all three competed with the focused one. Draining
  the hue demotes them to grey context, which is the part that reads as "less assertive".

  Opacity is only doing a little of the work, and deliberately so: it was 0.72 (indistinct from
  the focused row) and is now 0.6. Pushing it lower is the wrong lever -- at 0.46 the two grey
  rows were visibly strained, and these are content a reader may actually want to read. The
  filter is what creates the hierarchy; opacity only softens the last of it.

  The 0.28s is deliberately the same as the footer's cross-fade. The highlight used to change
  instantly while the footer took 400ms to settle, which read as the content jumping twice: once
  when the row lit up, once when the text caught up. Moving both together makes it one motion.
*/
.branch:not(.is-active) {
  opacity: 0.6;
  filter: saturate(0.15);
  transition: opacity 0.28s ease, filter 0.28s ease;
}

/* The focused row keeps full colour and contrast. `filter` must be reset, not merely omitted:
   `none` is what ends the inherited desaturation. */
.branch.is-active {
  opacity: 1;
  filter: none;
  transition: opacity 0.28s ease, filter 0.28s ease;
}

.branch.is-active .branch__tree,
.branch.is-active .branch__mgr,
.branch.is-active .branch__cmd {
  color: var(--accent);
}

.branch.is-active .branch__eco {
  color: var(--pmpx-term-text);
}

.branch.is-active .branch__mgr {
  text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 55%, transparent);
}

.branch.is-active .typed {
  text-shadow: 0 0 20px color-mix(in srgb, var(--accent) 60%, transparent);
}

.caret {
  display: inline-block;
  width: 0.55em;
  height: 1.05em;
  margin-left: 1px;
  vertical-align: -0.18em;
  background: currentColor;
  animation: caret-blink 1.05s step-end infinite;
}

/* A caret that is mid-keystroke must not blink: the blink is what says "idle, waiting on you". */
.caret--typing,
.caret--deleting {
  opacity: 1;
  animation: none;
}

@keyframes caret-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/*
  Below the table's natural width a strict grid costs more than it gives: the chain wraps as
  prose instead of running off the edge.
*/
@media (max-width: 560px) {
  .branch {
    white-space: normal;
  }

  .branch__cmd {
    min-width: 0;
  }
}
</style>

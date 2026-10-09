<script setup lang="ts">
// Resolved from crates.io at build time by `.vitepress/plugins/version.ts`, so the badge on this
// page cannot drift from the one in the navigation or from `pmpx --version` in the docs.
import { version } from 'virtual:pmpx-version'
import { ref } from 'vue'
import { useLocale } from '../composables/useLocale'
import { installOptions } from '../install'
import DetectionTerminal from './DetectionTerminal.vue'

const { t, path } = useLocale()

const copied = ref<string | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | null = null

async function copy(option: (typeof installOptions)[number]) {
  const text = option.segments.join(' ')
  try {
    await navigator.clipboard.writeText(text)
  }
  catch {
    // Clipboard access is denied in some embedding contexts and over plain http. The button is
    // an affordance, not the only way to get the command, so a refused write is not an error
    // worth a toast -- the command is already selectable text on screen.
    return
  }
  copied.value = option.id
  if (resetTimer !== null)
    clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = null), 1800)
}
</script>

<template>
  <section class="hero">
    <div class="hero__glow" aria-hidden="true" />
    <div class="hero__grid-bg" aria-hidden="true" />

    <div class="hero__inner">
      <div class="hero__copy">
        <span class="hero__eyebrow">
          <a class="hero__star" href="https://github.com/pmpx-rs/pmpx" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
              <path
                d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
              />
            </svg>
            Open source · MIT
          </a>
          <span class="hero__version">v{{ version }}</span>
        </span>

        <h1 class="hero__title">
          <!-- The brand mark, next to the wordmark it belongs to. See `public/brand-mark.svg`. -->
          <span class="hero__name">
            <img class="hero__mark" src="/brand-mark.svg" alt="" width="26" height="26">
            <!-- A CSS selector cannot reach a bare text node, so the wordmark is wrapped to
                 carry the gradient the container itself no longer can. -->
            <span class="hero__wordmark">{{ t.heroName }}</span>
          </span>
          <span class="hero__headline">{{ t.heroText }}</span>
        </h1>

        <p class="hero__tagline">
          {{ t.heroTagline }}
        </p>
        <p class="hero__lead">
          {{ t.heroLead }}
        </p>

        <div class="hero__actions">
          <a class="hero__btn hero__btn--brand" :href="path('/guide/quick-start')">
            {{ t.getStarted }}
            <svg
              viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </a>
          <a class="hero__btn hero__btn--alt" :href="path('/guide/detection')">
            {{ t.readDetection }}
          </a>
        </div>

        <div id="pmpx-install" class="install">
          <div class="install__head">
            <span class="install__label">{{ t.installTitle }}</span>
            <span class="install__note">{{ t.installNote }}</span>
          </div>

          <ul class="install__list">
            <li v-for="option in installOptions" :key="option.id" class="install__row">
              <span class="install__os">{{ option.label }}</span>
              <code class="install__cmd">
                <span v-for="(segment, i) in option.segments" :key="i">
                  <span v-if="i > 0" class="install__sep" />{{ segment }}
                </span>
              </code>
              <button
                type="button"
                class="install__copy"
                :class="{ 'is-copied': copied === option.id }"
                :aria-label="`${t.copy}: ${option.label}`"
                @click="copy(option)"
              >
                <svg
                  v-if="copied !== option.id"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a1 1 0 0 1 1-1h10" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12.5 9 17.5 20 6.5" />
                </svg>
                <span>{{ copied === option.id ? t.copied : t.copy }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="hero__demo">
        <DetectionTerminal />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 66px 24px 84px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.hero__glow {
  position: absolute;
  top: -320px;
  left: 50%;
  width: 1200px;
  height: 720px;
  transform: translateX(-50%);
  background: radial-gradient(
    50% 50% at 50% 50%,
    color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent),
    transparent 70%
  );
  filter: blur(30px);
  pointer-events: none;
}

/* A faint blueprint grid, fading out towards the bottom so the features do not fight it. */
.hero__grid-bg {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
      to right,
      color-mix(in srgb, var(--vp-c-divider) 55%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--vp-c-divider) 55%, transparent) 1px,
      transparent 1px
    );
  background-size: 56px 56px;
  mask-image: radial-gradient(70% 55% at 50% 30%, #000 20%, transparent 100%);
  -webkit-mask-image: radial-gradient(70% 55% at 50% 30%, #000 20%, transparent 100%);
  pointer-events: none;
}

.hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  gap: 56px;
  align-items: center;
  max-width: 1152px;
  margin: 0 auto;
}

.hero__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

/*
  The version, beside the licence badge. Quieter than the link next to it, because it is a fact
  rather than something to click. The value itself comes from crates.io at build time.
*/
.hero__version {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--pmpx-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
}

.hero__star {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 26%, transparent);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.hero__star:hover {
  border-color: var(--vp-c-brand-1);
}

.hero__title {
  margin: 0 0 20px;
  font-size: 46px;
  line-height: 1.12;
  letter-spacing: -0.035em;
  font-weight: 700;
  border: none;
  padding: 0;
}

.hero__name {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--pmpx-mono);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 12px;
  color: var(--pmpx-primary-1);
}

/*
  The mark and the wordmark share the row, so the gradient belongs on the *text* rather than on
  the container. `background-clip: text` with `color: transparent` on the container would paint
  the image transparent too -- the mark would simply not appear, with no error to explain it.
*/
.hero__mark {
  display: block;
  width: 26px;
  height: 26px;
  flex: none;
  /* Visual weight sits with the letters, so the mark is nudged to optical centre. */
  margin-top: -1px;
}

.hero__wordmark {
  background: linear-gradient(100deg, var(--vp-c-brand-1), var(--pmpx-go));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero__headline {
  display: block;
  color: var(--vp-c-text-1);
}

.hero__tagline {
  margin: 0 0 16px;
  font-size: 16.5px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
  max-width: 40em;
}

.hero__lead {
  margin: 0 0 28px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
  padding-left: 14px;
  border-left: 2px solid color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 34px;
}

.hero__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 44px;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
}

.hero__btn:active {
  transform: translateY(1px);
}

.hero__btn--brand {
  background: var(--vp-c-brand-3);
  color: #fff;
  border: 1px solid transparent;
}

.hero__btn--brand:hover {
  background: var(--vp-c-brand-2);
}

.hero__btn--alt {
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.hero__btn--alt:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.install {
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--pmpx-radius);
  background: var(--vp-c-bg-soft);
  padding: 14px 16px 6px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.install.is-flashing {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 4px var(--vp-c-brand-soft);
}

.install__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 10px;
}

.install__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.install__note {
  font-size: 11.5px;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}

.install__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.install__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-top: 1px solid color-mix(in srgb, var(--vp-c-divider) 60%, transparent);
}

.install__row:first-child {
  border-top: none;
}

.install__os {
  flex: none;
  width: 96px;
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}

.install__cmd {
  flex: 1;
  min-width: 0;
  font-family: var(--pmpx-mono);
  font-size: 12.5px;
  color: var(--vp-c-text-1);
  background: none;
  padding: 0;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.install__cmd::-webkit-scrollbar {
  display: none;
}

.install__copy {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.install__copy:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.install__copy.is-copied {
  color: var(--vp-c-brand-1);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
}

.hero__demo {
  min-width: 0;
}

@media (max-width: 1023px) {
  .hero {
    padding: 48px 22px 64px;
  }

  .hero__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
  }

  .hero__title {
    font-size: 38px;
  }

  .hero__demo {
    max-width: 620px;
  }
}

@media (max-width: 560px) {
  .hero {
    padding: 36px 18px 48px;
  }

  .hero__title {
    font-size: 30px;
  }

  .hero__tagline {
    font-size: 15px;
  }

  .hero__btn {
    flex: 1 1 100%;
    justify-content: center;
  }

  /*
    The OS label is not worth a column here, and a shell one-liner that has to be scrolled
    sideways is a one-liner that will be mistyped. The command gets the whole row and wraps
    instead; the platform is still named in the note above, in prose.
  */
  .install__os {
    display: none;
  }

  .install__row {
    gap: 6px;
  }

  .install__cmd {
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.7;
  }

  .install__copy span {
    display: none;
  }
}
</style>

<script setup lang="ts">
/**
 * The feature grid under the hero.
 *
 * Icons are inline paths rather than an icon font: six glyphs do not justify a dependency, and
 * `currentColor` lets them inherit the brand colour from CSS in both themes.
 */
import { useLocale } from '../composables/useLocale'

const { t } = useLocale()

const icons: Record<string, string[]> = {
  // A lens over stacked markers: "read what the project already has".
  detect: [
    'M3.5 6.5h5.5M3.5 10.5h4M3.5 14.5h4.5M3.5 18.5h6',
    'M15.5 6.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
    'M19.2 15.2 22 18',
  ],
  // Two arrows trading places: one verb in, another spelling out.
  translate: ['M3.5 7h13', 'M13.5 3.5 17 7l-3.5 3.5', 'M20.5 17h-13', 'M10.5 13.5 7 17l3.5 3.5'],
  // A puzzle piece dropping into place.
  plugin: [
    'M10 3.5h4v2a1.75 1.75 0 1 0 3.5 0v-2h2.5v4h-2a1.75 1.75 0 1 0 0 3.5h2v4h-4v2a1.75 1.75 0 1 1-3.5 0v-2H8.5v-4h2a1.75 1.75 0 1 0 0-3.5h-2v-4Z',
  ],
  // A balance: two weights tipping one way.
  tiebreak: ['M12 4v15', 'M6 19h12', 'M4 9h6', 'M14 9h6', 'M7 9l-3 5h6Z', 'M17 9l-3 5h6Z'],
  // A prompt with a caret: the escape hatch.
  exec: ['M4 6.5h3.5l4 5.5-4 5.5H4', 'M12.5 17.5H20', 'M4.5 4h15v16h-15Z'],
  // Braces: one object per line.
  json: [
    'M9.5 4c-2 0-2.5 1-2.5 2.5v3C7 11 6.4 12 5 12c1.4 0 2 1 2 2.5v3C7 19 7.5 20 9.5 20',
    'M14.5 4c2 0 2.5 1 2.5 2.5v3c0 1.5.6 2.5 2 2.5-1.4 0-2 1-2 2.5v3c0 1.5-.5 2.5-2.5 2.5',
  ],
}
</script>

<template>
  <section class="features">
    <ul class="features__grid">
      <li v-for="feature in t.features" :key="feature.title" class="features__card">
        <span class="features__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <path v-for="(d, i) in icons[feature.icon] ?? []" :key="i" :d="d" />
          </svg>
        </span>
        <h3 class="features__title">
          {{ feature.title }}
        </h3>
        <p class="features__details">
          {{ feature.details }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.features {
  max-width: 1152px;
  margin: 0 auto;
  padding: 8px 24px 0;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.features__card {
  position: relative;
  padding: 24px 22px 26px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--pmpx-radius);
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.features__card:hover {
  border-color: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 18px 40px -24px var(--pmpx-glow);
}

.features__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-bottom: 14px;
  border-radius: 10px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 22%, transparent);
}

.features__icon svg {
  width: 21px;
  height: 21px;
}

.features__title {
  margin: 0 0 8px;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.features__details {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

@media (max-width: 959px) {
  .features__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .features {
    padding-inline: 18px;
  }

  .features__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

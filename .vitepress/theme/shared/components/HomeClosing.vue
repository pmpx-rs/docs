<script setup lang="ts">
import { useLocale } from '../composables/useLocale'

const { t, path } = useLocale()
</script>

<template>
  <section class="closing">
    <div class="closing__card">
      <h2 class="closing__title">
        {{ t.closingTitle }}
      </h2>
      <p class="closing__text">
        {{ t.closingText }}
      </p>
      <div class="closing__actions">
        <a class="closing__btn" :href="path('/guide/quick-start')">{{ t.closingCta }}</a>
        <a
          class="closing__link"
          href="https://crates.io/crates/pmpx"
          target="_blank"
          rel="noreferrer"
        >
          {{ t.closingAlt }}
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.closing {
  max-width: 1152px;
  margin: 64px auto 0;
  padding: 0 24px;
}

.closing__card {
  position: relative;
  overflow: hidden;
  padding: 44px 36px 46px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--pmpx-radius-lg);
  background: var(--vp-c-bg-soft);
  text-align: center;
}

.closing__card::before {
  content: '';
  position: absolute;
  inset: auto -10% -60% -10%;
  height: 100%;
  background: radial-gradient(
    50% 100% at 50% 100%,
    color-mix(in srgb, var(--vp-c-brand-1) 26%, transparent),
    transparent 72%
  );
  pointer-events: none;
}

.closing__title {
  position: relative;
  margin: 0 0 10px;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--vp-c-text-1);
}

.closing__text {
  position: relative;
  margin: 0 auto 24px;
  max-width: 34em;
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.closing__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.closing__btn {
  display: inline-flex;
  align-items: center;
  height: 42px;
  padding: 0 22px;
  border-radius: 10px;
  background: var(--vp-c-brand-3);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.22s ease;
}

.closing__btn:hover {
  background: var(--vp-c-brand-2);
}

.closing__link {
  font-size: 13.5px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--vp-c-divider);
}

.closing__link:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

@media (max-width: 639px) {
  .closing {
    padding-inline: 18px;
    margin-top: 44px;
  }

  .closing__card {
    padding: 32px 20px 34px;
  }

  .closing__title {
    font-size: 21px;
  }
}
</style>

import type { Locale, Messages } from '../messages'
import { useData } from 'vitepress'
import { computed } from 'vue'
import { messages } from '../messages'

/**
 * The current locale, as a two-value thing.
 *
 * VitePress already knows this (`useData().lang.value`), but translating that into "is this the
 * Chinese site" at every call site is noise. Everything here reads the one flag.
 */
export function useLocale() {
  const { lang } = useData()

  const locale = computed<Locale>(() => (lang.value?.startsWith('zh') ? 'zh' : 'en'))
  const t = computed<Messages>(() => messages[locale.value])
  const isZh = computed(() => locale.value === 'zh')

  /** Prefix an absolute site path for the current locale: `/guide/detection` -> `/zh/guide/...`. */
  function path(absolute: string): string {
    if (!isZh.value)
      return absolute
    return absolute === '/' ? '/zh/' : `/zh${absolute}`
  }

  return { locale, t, isZh, path }
}

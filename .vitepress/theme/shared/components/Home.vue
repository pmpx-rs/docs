<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
/**
 * The layout for every page.
 *
 * The home page is custom, but it is *not* a replacement for VitePress's layout: it fills the
 * layout's hero slots instead. Rendering the home page on its own was the earlier mistake -- it
 * dropped the navigation bar along with everything in it, which is why the home page had no
 * language switcher, no search and no theme toggle. The switcher was never missing; the nav was.
 *
 * Everything outside the home page is stock VitePress.
 */
import { computed } from 'vue'
import HomeClosing from './HomeClosing.vue'
import HomeFeatures from './HomeFeatures.vue'
import HomeHero from './HomeHero.vue'

const { Layout: DefaultLayout } = DefaultTheme
const { frontmatter } = useData()

const isHome = computed(
  () => frontmatter.value.layout === 'home' || frontmatter.value.home === true,
)
</script>

<template>
  <DefaultLayout :class="{ 'is-custom-home': isHome }">
    <template #home-hero-before>
      <HomeHero v-if="isHome" />
    </template>

    <template #home-hero-after>
      <template v-if="isHome">
        <HomeFeatures />
        <HomeClosing />
      </template>
    </template>
  </DefaultLayout>
</template>

<style scoped>
/*
  The default home hero and feature grid are still rendered underneath, since the layout owns
  them and offers no way to decline. Hidden rather than fought with: they are behind two stable
  classes, and hiding them keeps the nav, the footer and every slot working normally.

  `:deep()` is required -- these elements belong to the default theme, so scoped CSS would
  otherwise never reach them.
*/
.is-custom-home :deep(.VPHomeHero),
.is-custom-home :deep(.VPHomeFeatures),
.is-custom-home :deep(.VPHomeSponsors) {
  display: none;
}
</style>

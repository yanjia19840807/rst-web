<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useSessionStore } from '@/auth/session'
import { isMenuItemActive, menuItems } from '@/navigation/menu'

const route = useRoute()
const session = useSessionStore()

onMounted(() => {
  void session.load()
})

const title = computed(() => String(route.meta.title ?? 'Right Sizing Tool'))
const subtitle = computed(() => String(route.meta.subtitle ?? 'Right Sizing Tool'))

const visibleMenu = computed(() =>
  menuItems.filter((item) => session.hasPermission(item.permission)),
)

const linkClass =
  'block rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

const activeLinkClass = 'bg-sidebar-accent text-sidebar-accent-foreground'
const copyrightYear = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_1fr]">
    <a
      href="#main-content"
      class="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Skip to content
    </a>

    <aside class="bg-sidebar text-sidebar-foreground lg:min-h-screen">
      <div class="flex h-16 items-center border-b border-sidebar-border px-5">
        <RouterLink to="/" class="flex items-center gap-3 font-semibold">
          <span
            class="relative grid size-9 place-items-center rounded-md bg-white text-sm text-brand-navy after:absolute after:right-0 after:bottom-0 after:left-0 after:h-1 after:rounded-b-md after:bg-brand-red"
            aria-hidden="true"
          >
            RST
          </span>
          <span>Right Sizing Tool</span>
        </RouterLink>
      </div>

      <div class="px-3 py-5">
        <nav aria-label="Application">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col">
            <li v-for="item in visibleMenu" :key="item.to" class="shrink-0">
              <RouterLink
                :to="item.to"
                :class="[linkClass, isMenuItemActive(item, route.path) ? activeLinkClass : '']"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </aside>

    <div class="flex min-h-screen min-w-0 flex-col">
      <header class="border-b bg-card">
        <div class="flex min-h-16 items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <div>
            <h1 class="text-lg font-semibold">{{ title }}</h1>
            <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
          </div>
          <div class="min-w-0 text-right">
            <div class="truncate text-sm font-semibold text-foreground">
              {{ session.loading ? 'Loading…' : session.displayName || '—' }}
            </div>
            <div class="truncate text-xs text-muted-foreground" :title="session.rolesLabel">
              <template v-if="session.ccgid">
                {{ session.ccgid }}
                <template v-if="session.rolesLabel"> · {{ session.rolesLabel }}</template>
              </template>
              <template v-else-if="!session.loading">—</template>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" class="w-full flex-1 px-4 py-5 sm:px-6">
        <slot />
      </main>

      <footer class="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        © {{ copyrightYear }} CMA CGM Group
      </footer>
    </div>
  </div>
</template>

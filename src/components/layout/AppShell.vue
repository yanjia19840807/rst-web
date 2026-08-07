<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const agentNavigation = [
  { label: 'TMS Session', to: '/agent/session' },
  { label: 'TMS List', to: '/agent/sessions' },
] as const
const supervisorNavigation = [
  { label: 'Toolkits', to: '/supervisor/toolkits' },
  { label: 'Exercises', to: '/supervisor/exercises' },
] as const
const approverNavigation = [
  { label: 'Approval Queue', to: '/approver/queue' },
] as const

const route = useRoute()
const title = computed(() => String(route.meta.title ?? 'Agent workspace'))
const subtitle = computed(() => String(route.meta.subtitle ?? 'Right Sizing Tool'))
// Route metadata is a temporary presentation-only role switch until authentication is integrated.
const role = computed(() => (route.meta.roles as string[] | undefined)?.[0] ?? 'agent')
const roleLabel = computed(() => {
  if (role.value === 'supervisor') return 'Supervisor'
  if (role.value === 'approver') return 'Approver'
  return 'Agent'
})
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
        <p class="px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
          Agent
        </p>
        <nav class="mt-2" aria-label="Agent navigation">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col">
            <li v-for="item in agentNavigation" :key="item.to" class="shrink-0">
              <RouterLink
                :to="item.to"
                class="block rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                active-class="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
        <p class="mt-6 px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
          Supervisor
        </p>
        <nav class="mt-2" aria-label="Supervisor navigation">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col">
            <li v-for="item in supervisorNavigation" :key="item.to" class="shrink-0">
              <RouterLink
                :to="item.to"
                class="block rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                active-class="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
        <p class="mt-6 px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
          Approver
        </p>
        <nav class="mt-2" aria-label="Approver navigation">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col">
            <li v-for="item in approverNavigation" :key="item.to" class="shrink-0">
              <RouterLink
                :to="item.to"
                class="block rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                active-class="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </aside>

    <div class="min-w-0">
      <header class="border-b bg-card">
        <div class="flex min-h-16 items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <div>
            <h1 class="text-lg font-semibold">{{ title }}</h1>
            <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
          </div>
          <span class="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">
            {{ roleLabel }}
          </span>
        </div>
      </header>

      <main id="main-content" class="w-full px-4 py-5 sm:px-6">
        <slot />
      </main>
    </div>
  </div>
</template>

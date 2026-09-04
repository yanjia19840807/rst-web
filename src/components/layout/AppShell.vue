<script setup lang="ts">
import { Menu, TriangleAlert, X } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { queryClient } from '@/api/query-client'
import { DELEGATION_ENDED_EVENT } from '@/auth/delegation'
import { useSessionStore } from '@/auth/session'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isMenuItemActive, menuItems } from '@/navigation/menu'
import { PAGE_ACTIONS_TARGET_ID } from '@/components/page-actions'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
if (!session.user && !session.signedOut) {
  session.applyLocalIdentity()
}

async function onDelegationEnded() {
  await session.stopActing()
  queryClient.clear()
  toast.message('Delegation ended. You are back to your own account.')
  if (route.name === 'settings-delegation' && !session.canManageDelegation) {
    await router.push(session.homePath)
  }
  if (route.name === 'settings-mail' && !session.canManageMailPreferences) {
    await router.push(session.homePath)
  }
}

onMounted(() => {
  void session.load()
  window.addEventListener(DELEGATION_ENDED_EVENT, onDelegationEnded)
})

onUnmounted(() => {
  window.removeEventListener(DELEGATION_ENDED_EVENT, onDelegationEnded)
})

async function stopActing() {
  await session.stopActing()
  queryClient.clear()
  await router.push(session.homePath)
}

const menuOpen = ref(false)
const title = computed(() => String(route.meta.title ?? 'Right Sizing Tool'))
const subtitle = computed(() => String(route.meta.subtitle ?? 'Right Sizing Tool'))

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

const visibleMenu = computed(() =>
  menuItems.filter((item) => session.hasPermission(item.permission)),
)

const linkClass =
  'block rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

const activeLinkClass = 'bg-sidebar-accent text-sidebar-accent-foreground'
const copyrightYear = new Date().getFullYear()
</script>

<template>
  <div class="flex h-svh flex-col overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[240px_1fr]">
    <a
      href="#main-content"
      class="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Skip to content
    </a>

    <aside class="shrink-0 bg-sidebar text-sidebar-foreground lg:h-full lg:overflow-y-auto">
      <div class="flex h-16 items-center justify-between gap-3 border-b border-sidebar-border px-4 lg:px-5">
        <RouterLink :to="session.homePath" class="flex min-w-0 items-center gap-3 font-semibold">
          <span
            class="relative grid size-9 shrink-0 place-items-center rounded-md bg-white text-sm text-brand-navy after:absolute after:right-0 after:bottom-0 after:left-0 after:h-1 after:rounded-b-md after:bg-brand-red"
            aria-hidden="true"
          >
            RST
          </span>
          <span class="truncate">Right Sizing Tool</span>
        </RouterLink>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
          :aria-expanded="menuOpen"
          aria-controls="app-navigation"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" />
          <Menu v-else />
        </Button>
      </div>

      <nav
        id="app-navigation"
        aria-label="Application"
        class="border-sidebar-border px-3 py-3 lg:block lg:border-t-0 lg:py-5"
        :class="menuOpen ? 'block border-t' : 'hidden lg:block'"
      >
        <ul class="flex flex-col gap-1">
          <li v-for="item in visibleMenu" :key="item.to">
            <RouterLink
              :to="item.to"
              :class="[linkClass, isMenuItemActive(item, route.path) ? activeLinkClass : '']"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="shrink-0 border-b bg-card">
        <div class="flex min-h-16 items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <div>
            <h1 class="text-lg font-semibold">{{ title }}</h1>
            <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
          </div>
          <div class="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <Alert
          v-if="session.actingAs"
          variant="warning"
          role="status"
          class="rounded-none border-x-0 border-b-0 px-4 py-2.5 sm:px-6"
        >
          <TriangleAlert />
          <AlertTitle>
            You are acting as {{ session.displayName }} ({{ session.rolesLabel || 'RST' }}).
          </AlertTitle>
          <AlertDescription>Signed in as {{ session.actorDisplayName }}.</AlertDescription>
          <AlertAction>
            <Button type="button" size="sm" variant="outline" @click="stopActing">
              Stop acting
            </Button>
          </AlertAction>
        </Alert>
        <div :id="PAGE_ACTIONS_TARGET_ID" class="empty:hidden" />
      </header>

      <main
        id="main-content"
        class="min-h-0 min-w-0 w-full flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <slot />
      </main>

      <footer
        class="shrink-0 border-t bg-card px-4 py-3 text-center text-xs text-muted-foreground sm:px-6"
      >
        © {{ copyrightYear }} CMA CGM Group
      </footer>
    </div>
  </div>
</template>

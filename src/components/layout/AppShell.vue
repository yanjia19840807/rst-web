<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { queryClient } from '@/api/query-client'
import { DELEGATION_ENDED_EVENT } from '@/auth/delegation'
import { useSessionStore } from '@/auth/session'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isMenuItemActive, menuItems } from '@/navigation/menu'
import UserMenu from './UserMenu.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

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
        <RouterLink :to="session.homePath" class="flex items-center gap-3 font-semibold">
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
          <UserMenu />
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
      </header>

      <main id="main-content" class="w-full flex-1 px-4 py-5 sm:px-6">
        <slot />
      </main>

      <footer class="border-t bg-card px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        © {{ copyrightYear }} CMA CGM Group
      </footer>
    </div>
  </div>
</template>

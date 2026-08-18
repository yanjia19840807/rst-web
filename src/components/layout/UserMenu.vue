<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

import { queryClient } from '@/api/query-client'
import { useSessionStore } from '@/auth/session'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'

const session = useSessionStore()
const open = ref(false)

const details = computed(() => [
  { label: 'CCGID', value: session.ccgid || '—' },
  { label: 'Email', value: session.email || '—' },
  { label: 'Role', value: session.rolesLabel || '—' },
])

async function onSignOut() {
  open.value = false
  await session.signOut()
  queryClient.clear()
}
</script>

<template>
  <div v-if="session.loading && !session.user" class="flex min-h-10 items-center justify-end">
    <Spinner class="size-4 text-primary" />
  </div>

  <div v-else-if="session.signedOut" class="min-w-0 text-right">
    <div class="text-sm font-semibold">Signed out</div>
    <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="session.signIn()">
      Sign in
    </Button>
  </div>

  <Popover v-else v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex min-w-0 max-w-64 items-center gap-1.5 rounded-md px-2 py-1 text-right hover:bg-muted"
        aria-label="Open account menu"
      >
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-foreground">
            {{ session.displayName || '—' }}
          </span>
          <span class="block truncate text-xs text-muted-foreground">
            {{ session.rolesLabel || session.ccgid || 'Account' }}
          </span>
        </span>
        <ChevronDownIcon class="size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-72 gap-0 p-0">
      <div class="px-3.5 py-3">
        <div class="text-sm font-semibold">{{ session.displayName || '—' }}</div>
        <dl class="mt-3 space-y-2">
          <div v-for="row in details" :key="row.label" class="grid gap-0.5">
            <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
            <dd class="break-all text-sm">{{ row.value }}</dd>
          </div>
        </dl>
      </div>
      <div class="border-t p-2">
        <Button type="button" class="w-full" @click="onSignOut">
          Sign out
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>

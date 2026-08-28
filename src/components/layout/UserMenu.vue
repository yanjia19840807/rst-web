<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { queryClient } from '@/api/query-client'
import { useSessionStore } from '@/auth/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { useReceivedDelegationsQuery } from '@/features/delegation/api/queries'

const session = useSessionStore()
const router = useRouter()
const open = ref(false)
const receivedQuery = useReceivedDelegationsQuery()

const details = computed(() => [
  { label: 'CCGID', value: session.ccgid || '—' },
  { label: 'Email', value: session.email || '—' },
  { label: 'Role', value: session.rolesLabel || '—' },
])

const actAsOptions = computed(() =>
  (receivedQuery.data.value ?? []).filter((row) => row.status === 'ACTIVE'),
)

const showDelegationGroup = computed(
  () => session.actingAs || session.canManageDelegation || actAsOptions.value.length > 0,
)

const itemClass =
  'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'

async function onSignOut() {
  open.value = false
  await session.signOut()
  queryClient.clear()
}

async function goDelegation() {
  open.value = false
  await router.push({ name: 'settings-delegation' })
}

async function goMailPreferences() {
  open.value = false
  await router.push({ name: 'settings-mail' })
}

async function actAs(id: string) {
  open.value = false
  await session.actAs(id)
  queryClient.clear()
  await router.push(session.homePath)
}

async function stopActing() {
  open.value = false
  await session.stopActing()
  queryClient.clear()
  await router.push(session.homePath)
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
        class="flex min-w-0 max-w-72 items-center gap-1.5 rounded-md px-2 py-1 text-right hover:bg-muted"
        aria-label="Open account menu"
      >
        <span class="min-w-0">
          <span class="flex items-center justify-end gap-1.5">
            <span class="block truncate text-sm font-semibold text-foreground">
              {{ session.displayName || '—' }}
            </span>
            <Badge v-if="session.actingAs" variant="secondary">Acting as</Badge>
          </span>
          <span class="block truncate text-xs text-muted-foreground">
            {{ session.rolesLabel || session.ccgid || 'Account' }}
          </span>
        </span>
        <ChevronDownIcon class="size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-80 gap-0 p-0">
      <section class="grid gap-3 px-3.5 py-3">
        <div class="grid gap-0.5">
          <p class="text-sm font-semibold">{{ session.displayName || '—' }}</p>
          <p v-if="session.actingAs" class="text-xs text-muted-foreground">
            Signed in as {{ session.actorDisplayName }}
          </p>
        </div>
        <dl class="grid gap-2">
          <div v-for="row in details" :key="row.label" class="grid gap-0.5">
            <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
            <dd class="break-all text-sm">{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="showDelegationGroup" class="grid gap-1 border-t px-2 py-2">
        <p class="px-2 py-1 text-xs font-medium text-muted-foreground">Delegation</p>
        <button
          v-if="session.actingAs"
          type="button"
          :class="itemClass"
          @click="stopActing"
        >
          Stop acting
        </button>
        <template v-else>
          <button
            v-for="row in actAsOptions"
            :key="row.id"
            type="button"
            :class="itemClass"
            @click="actAs(row.id)"
          >
            Act as {{ row.delegatorName || row.delegatorCcgid }}
          </button>
          <button
            v-if="session.canManageDelegation"
            type="button"
            :class="itemClass"
            @click="goDelegation"
          >
            Manage delegation
          </button>
        </template>
      </section>

      <section v-if="session.canManageMailPreferences" class="grid gap-1 border-t px-2 py-2">
        <p class="px-2 py-1 text-xs font-medium text-muted-foreground">Settings</p>
        <button type="button" :class="itemClass" @click="goMailPreferences">
          Email notifications
        </button>
      </section>

      <section class="border-t px-2 py-2">
        <button type="button" :class="itemClass" @click="onSignOut">
          Sign out
        </button>
      </section>
    </PopoverContent>
  </Popover>
</template>

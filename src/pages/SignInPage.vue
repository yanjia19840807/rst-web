<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'

import { useSessionStore } from '@/auth/session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const session = useSessionStore()
const copyrightYear = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background text-foreground">
    <main class="flex flex-1 items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-8 flex items-center gap-3 font-semibold">
          <span
            class="relative grid size-9 shrink-0 place-items-center rounded-md bg-white text-sm text-brand-navy ring-1 ring-foreground/10 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-1 after:rounded-b-md after:bg-brand-red"
            aria-hidden="true"
          >
            RST
          </span>
          <span>Right Sizing Tool</span>
        </div>

        <Alert v-if="session.error" variant="warning" role="alert">
          <TriangleAlert />
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{{ session.error }}</AlertDescription>
        </Alert>
        <div v-else class="space-y-2">
          <h1 class="text-lg font-semibold">
            {{ session.signedOut ? 'Signed out' : 'Sign in' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{
              session.signedOut
                ? 'You are signed out of Right Sizing Tool.'
                : 'Sign in with your CMA CGM account to continue.'
            }}
          </p>
        </div>

        <div class="mt-6 flex items-center gap-2">
          <Button type="button" @click="session.signIn()">Sign in</Button>
          <Button v-if="session.error" type="button" variant="outline" @click="session.signOut()">
            Sign out
          </Button>
        </div>
      </div>
    </main>
    <footer class="px-4 py-3 text-center text-xs text-muted-foreground">
      © {{ copyrightYear }} CMA CGM Group
    </footer>
  </div>
</template>

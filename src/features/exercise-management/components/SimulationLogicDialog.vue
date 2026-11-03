<script setup lang="ts">
import { computed, ref } from 'vue'
import { Info } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { SIZING_LOGIC, SLOT_LOGIC, type LogicSection, type SimulationLogic } from '../simulationLogic'

const props = defineProps<{
  kind: 'sizing' | 'slot'
}>()

const open = ref(false)
const scroller = ref<HTMLElement | null>(null)

const doc = computed<SimulationLogic>(() => (props.kind === 'slot' ? SLOT_LOGIC : SIZING_LOGIC))

function jump(id: string) {
  const root = scroller.value
  const target = root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (!root || !target) return
  const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
  root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

function showGroupLabel(sections: LogicSection[], index: number) {
  return index === 0 || sections[index].group !== sections[index - 1].group
}
</script>

<template>
  <Button variant="outline" size="sm" type="button" @click="open = true">
    <Info />
    How this works
  </Button>

  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none border-b-0 px-6 py-4 pr-12">
        <DialogTitle>{{ doc.title }}</DialogTitle>
        <DialogDescription>{{ doc.summary }}</DialogDescription>
      </DialogHeader>
      <div class="flex shrink-0 flex-wrap gap-1 border-b bg-card px-4 py-2">
        <Button
          v-for="section in doc.sections"
          :key="section.id"
          variant="ghost"
          size="sm"
          type="button"
          @click="jump(section.id)"
        >
          {{ section.nav }}
        </Button>
      </div>

      <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-4">
        <div class="grid gap-6">
          <template v-for="(section, index) in doc.sections" :key="section.id">
            <p
              v-if="showGroupLabel(doc.sections, index)"
              class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              :class="index > 0 ? 'border-t border-border pt-5' : undefined"
            >
              {{ section.group === 'results' ? 'Results' : 'Charts' }}
            </p>
            <section :id="section.id">
              <h4 class="text-sm font-semibold">{{ section.title }}</h4>
              <p v-if="section.note" class="mt-1 text-xs leading-relaxed text-muted-foreground">
                {{ section.note }}
              </p>

              <div v-if="section.sources.length" class="mt-3 overflow-x-auto rounded-md border bg-muted">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead class="h-8 px-2 text-xs">Variable</TableHead>
                      <TableHead class="h-8 px-2 text-xs">Source</TableHead>
                      <TableHead class="h-8 px-2 text-xs">Taken as</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="row in section.sources" :key="row.symbol">
                      <TableCell class="px-2 py-1.5 text-xs font-medium whitespace-nowrap">
                        {{ row.symbol }}
                      </TableCell>
                      <TableCell class="px-2 py-1.5 text-xs whitespace-nowrap">
                        {{ row.source }}
                      </TableCell>
                      <TableCell class="px-2 py-1.5 text-xs whitespace-normal text-muted-foreground">
                        {{ row.rule }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div v-if="section.formulas.length" class="mt-3 grid gap-2">
                <div v-for="(formula, formulaIndex) in section.formulas" :key="formulaIndex">
                  <p
                    v-if="formula.title"
                    class="mb-1 text-xs font-medium text-foreground"
                  >
                    {{ formula.title }}
                  </p>
                  <pre
                    class="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap"
                    >{{ formula.text }}</pre
                  >
                </div>
              </div>

              <ul
                v-if="section.remarks.length"
                class="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"
              >
                <li v-for="remark in section.remarks" :key="remark">{{ remark }}</li>
              </ul>
            </section>
          </template>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3" show-close-button />
    </DialogContent>
  </Dialog>
</template>

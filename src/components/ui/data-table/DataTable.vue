<script setup lang="ts" generic="TData, TValue">
import type { ColumnDef, VisibilityState } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { computed } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import './types'

const props = withDefaults(
  defineProps<{
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pending?: boolean
    emptyText?: string
    tableClass?: string
    getRowId?: (row: TData, index: number) => string
    columnVisibility?: VisibilityState
  }>(),
  {
    emptyText: 'No results.',
  },
)

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row, index) => (props.getRowId ? props.getRowId(row, index) : String(index)),
  state: {
    get columnVisibility() {
      return props.columnVisibility ?? {}
    },
  },
})

const headerGroups = computed(() => {
  void props.data
  void props.columns
  void props.columnVisibility
  return table.getHeaderGroups()
})

const rows = computed(() => {
  void props.data
  void props.columns
  void props.columnVisibility
  return table.getRowModel().rows
})

const colCount = computed(() => {
  void props.columns
  void props.columnVisibility
  return table.getVisibleLeafColumns().length
})
</script>

<template>
  <div class="w-0 min-w-full overflow-x-auto rounded-md border">
    <Table :class="tableClass">
      <TableHeader>
        <TableRow v-for="headerGroup in headerGroups" :key="headerGroup.id">
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :class="header.column.columnDef.meta?.headerClass"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="pending && !rows.length">
          <TableRow>
            <TableCell :colspan="colCount" class="p-0">
              <ListLoading />
            </TableCell>
          </TableRow>
        </template>
        <template v-else-if="rows.length">
          <TableRow
            v-for="row in rows"
            :key="row.id"
            :data-state="row.getIsSelected() && 'selected'"
          >
            <TableCell
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              :class="cell.column.columnDef.meta?.cellClass"
            >
              <FlexRender
                :render="cell.column.columnDef.cell"
                :props="cell.getContext()"
              />
            </TableCell>
          </TableRow>
        </template>
        <TableRow v-else>
          <TableCell :colspan="colCount" class="h-24 text-center text-muted-foreground">
            <slot name="empty">{{ emptyText }}</slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

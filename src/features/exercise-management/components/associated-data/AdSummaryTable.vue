<script setup lang="ts">
export type AdSummaryRow = {
  key?: string
  label: string
  value?: string | number | null
}

defineProps<{
  rows: AdSummaryRow[]
}>()

function slotName(row: AdSummaryRow) {
  return row.key ?? row.label
}

function displayValue(value: AdSummaryRow['value']) {
  if (value === 0) return '0'
  return value == null || value === '' ? '—' : String(value)
}
</script>

<template>
  <table class="w-full border-collapse text-sm">
    <tbody>
      <tr v-for="row in rows" :key="slotName(row)" class="border-b">
        <td class="w-[32%] py-2 align-top text-muted-foreground">{{ row.label }}</td>
        <td class="py-2">
          <slot :name="slotName(row)" :row="row">{{ displayValue(row.value) }}</slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

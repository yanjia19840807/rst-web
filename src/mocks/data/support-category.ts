import type { SupportCategoryAdminRow, SupportCategoryOption } from '@/features/support-category/types'

const seed: SupportCategoryAdminRow[] = [
  adminRow('31000000-0000-0000-0000-000000000001', 'Communication', 1),
  adminRow('31000000-0000-0000-0000-000000000002', 'Operational Support', 2),
  adminRow('31000000-0000-0000-0000-000000000003', 'Quality Control', 3),
  adminRow('31000000-0000-0000-0000-000000000004', 'Reporting', 4),
  adminRow('31000000-0000-0000-0000-000000000005', 'Small Process', 5),
  adminRow('31000000-0000-0000-0000-000000000006', 'Training', 6),
  adminRow('31000000-0000-0000-0000-000000000007', 'Tool Support', 7),
  adminRow('31000000-0000-0000-0000-000000000008', 'Project Support', 8),
  adminRow('31000000-0000-0000-0000-000000000009', 'Performance Monitoring', 9),
]

const rows: SupportCategoryAdminRow[] = seed.map((item) => ({ ...item }))

function adminRow(id: string, name: string, displayOrder: number): SupportCategoryAdminRow {
  return {
    id,
    name,
    status: 'ACTIVE',
    displayOrder,
    updatedAt: '2026-08-19T01:00:00Z',
  }
}

function sortRows() {
  rows.sort(
    (left, right) =>
      left.displayOrder - right.displayOrder ||
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  )
}

function asOption(row: SupportCategoryAdminRow): SupportCategoryOption {
  return { id: row.id, name: row.name }
}

export const supportCategoryStore = {
  list: () => ({
    categories: rows.filter((row) => row.status === 'ACTIVE').map(asOption),
  }),
  listAdmin: () => ({ categories: [...rows] }),
  lookup(categoryId: string) {
    return rows.find((item) => item.id === categoryId) ?? null
  },
  create(name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      return { error: 'Name is required.' }
    }
    if (rows.some((row) => row.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'A Category with this name already exists.' }
    }
    const displayOrder = Math.max(0, ...rows.map((row) => row.displayOrder)) + 1
    const row = adminRow(crypto.randomUUID(), trimmed, displayOrder)
    row.updatedAt = new Date().toISOString()
    rows.push(row)
    sortRows()
    return { row }
  },
  update(
    id: string,
    body: { name: string; status: 'ACTIVE' | 'INACTIVE'; displayOrder: number },
  ) {
    const row = rows.find((item) => item.id === id)
    if (!row) return { error: 'The Category was not found.' }
    const name = body.name.trim()
    if (!name) return { error: 'Name is required.' }
    if (rows.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
      return { error: 'A Category with this name already exists.' }
    }
    if (body.status !== 'ACTIVE' && body.status !== 'INACTIVE') {
      return { error: 'Status must be ACTIVE or INACTIVE.' }
    }
    if (body.displayOrder !== row.displayOrder) {
      const other = rows.find((item) => item.id !== id && item.displayOrder === body.displayOrder)
      if (other) {
        other.displayOrder = row.displayOrder
        other.updatedAt = new Date().toISOString()
      }
      row.displayOrder = body.displayOrder
    }
    row.name = name
    row.status = body.status
    row.updatedAt = new Date().toISOString()
    sortRows()
    return { row }
  },
  reorder(ids: string[]) {
    if (new Set(ids).size !== ids.length || ids.length !== rows.length) {
      return { error: 'Category order is out of date. Refresh and try again.' }
    }
    const byId = new Map(rows.map((row) => [row.id, row]))
    const next: SupportCategoryAdminRow[] = []
    for (const [index, id] of ids.entries()) {
      const row = byId.get(id)
      if (!row) {
        return { error: 'Category order is out of date. Refresh and try again.' }
      }
      row.displayOrder = index + 1
      row.updatedAt = new Date().toISOString()
      next.push(row)
    }
    rows.splice(0, rows.length, ...next)
    return { categories: [...rows] }
  },
  remove(id: string) {
    const index = rows.findIndex((item) => item.id === id)
    if (index < 0) return { error: 'The Category was not found.' }
    rows.splice(index, 1)
    return {}
  },
}

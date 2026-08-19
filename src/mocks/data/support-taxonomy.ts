const seedCategories = [
  { id: '31000000-0000-0000-0000-000000000001', name: 'Communication' },
  { id: '31000000-0000-0000-0000-000000000002', name: 'Operational Support' },
  { id: '31000000-0000-0000-0000-000000000003', name: 'Quality Control' },
  { id: '31000000-0000-0000-0000-000000000004', name: 'Reporting' },
  { id: '31000000-0000-0000-0000-000000000005', name: 'Small Process' },
  { id: '31000000-0000-0000-0000-000000000006', name: 'Training' },
  { id: '31000000-0000-0000-0000-000000000007', name: 'Tool Support' },
  { id: '31000000-0000-0000-0000-000000000008', name: 'Project Support' },
  { id: '31000000-0000-0000-0000-000000000009', name: 'Performance Monitoring' },
]

export const supportTaxonomyStore = {
  list: () => ({ categories: seedCategories }),
  lookup(categoryId: string) {
    return seedCategories.find((item) => item.id === categoryId) ?? null
  },
}

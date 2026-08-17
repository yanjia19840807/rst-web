export function pageOf<T>(items: T[], page: number, pageSize: number) {
  const safePageSize = Math.min(100, Math.max(1, pageSize || 10))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safePageSize) || 1)
  const safePage = Math.min(Math.max(1, page || 1), totalPages)
  return {
    items: items.slice((safePage - 1) * safePageSize, safePage * safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
  }
}

export function pageParams(url: URL) {
  return {
    page: Number(url.searchParams.get('page') ?? 1),
    pageSize: Number(url.searchParams.get('pageSize') ?? 10),
  }
}

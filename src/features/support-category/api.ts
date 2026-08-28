import { apiRequest } from '@/api/client'

import type {
  CreateSupportCategoryRequest,
  ReorderSupportCategoriesRequest,
  SupportCategoryAdminRow,
  SupportCategoryAdminView,
  SupportCategoryView,
  UpdateSupportCategoryRequest,
} from './types'

const BASE = '/api/v1/support-categories'
const ADMIN_BASE = '/api/v1/admin/support-categories'

export const supportCategoryApi = {
  list: () => apiRequest<SupportCategoryView>(BASE),
  listAdmin: () => apiRequest<SupportCategoryAdminView>(ADMIN_BASE),
  create: (body: CreateSupportCategoryRequest) =>
    apiRequest<SupportCategoryAdminRow>(ADMIN_BASE, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: UpdateSupportCategoryRequest) =>
    apiRequest<SupportCategoryAdminRow>(`${ADMIN_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  reorder: (body: ReorderSupportCategoriesRequest) =>
    apiRequest<SupportCategoryAdminView>(`${ADMIN_BASE}/order`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiRequest<void>(`${ADMIN_BASE}/${id}`, {
      method: 'DELETE',
    }),
}

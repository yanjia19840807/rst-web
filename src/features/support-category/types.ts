import type { AuditActor } from '@/lib/auditActor'

export interface SupportCategoryOption {
  id: string
  name: string
}

export interface SupportCategoryView {
  categories: SupportCategoryOption[]
}

export type SupportCategoryStatus = 'ACTIVE' | 'INACTIVE'

export interface SupportCategoryAdminRow {
  id: string
  name: string
  status: SupportCategoryStatus
  displayOrder: number
  createdBy?: AuditActor | null
  createdAt?: string | null
  updatedAt: string
}

export interface SupportCategoryAdminView {
  categories: SupportCategoryAdminRow[]
}

export interface CreateSupportCategoryRequest {
  name: string
}

export interface UpdateSupportCategoryRequest {
  name: string
  displayOrder: number
}

export interface ReorderSupportCategoriesRequest {
  ids: string[]
}

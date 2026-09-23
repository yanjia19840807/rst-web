import { isAppRole, permissionsForRoles, type AppRole } from '@/auth/permissions'
import { isMenuItemActive, menuItems } from '@/navigation/menu'
import type { RouteLocationNormalized } from 'vue-router'

/**
 * Route meta.roles are workspace aliases. Session roles are product codes.
 * Keep this map in sync with {@link menuItems} permissions.
 */
const ROUTE_ROLE_ALIASES: Record<string, readonly AppRole[]> = {
  agent: ['AGENT'],
  supervisor: ['SUPERVISOR'],
  approver: ['SR_MANAGER', 'DOMAIN_HEAD', 'LOCAL_TRANSFORMATION_HEAD'],
  ho: ['GOVERNANCE', 'ADMIN', 'LOCAL_TRANSFORMATION_HEAD'],
  admin: ['ADMIN'],
}

export function requiredRouteRoles(to: RouteLocationNormalized): string[] {
  return to.matched.flatMap((record) => {
    const roles = record.meta.roles
    return Array.isArray(roles) ? roles.map((role) => String(role).toLowerCase()) : []
  })
}

function productRoles(roles: readonly string[]): AppRole[] {
  return roles.map((role) => role.toUpperCase()).filter(isAppRole)
}

function matchesAlias(alias: string, roles: readonly AppRole[]): boolean {
  const mapped = ROUTE_ROLE_ALIASES[alias.toLowerCase()]
  if (mapped) {
    return mapped.some((role) => roles.includes(role))
  }
  return roles.some((role) => role.toLowerCase() === alias.toLowerCase())
}

export function menuItemForPath(path: string) {
  return menuItems.find((item) => isMenuItemActive(item, path)) ?? null
}

/**
 * A user may open a route when their product role matches the alias, or when
 * the side menu already grants that page by permission.
 */
export function allowsRoute(to: RouteLocationNormalized, roles: readonly string[]): boolean {
  const required = requiredRouteRoles(to)
  if (!required.length) return true
  const have = productRoles(roles)
  if (required.some((alias) => matchesAlias(alias, have))) return true
  const item = menuItemForPath(to.path)
  if (!item) return false
  return permissionsForRoles(have).includes(item.permission)
}

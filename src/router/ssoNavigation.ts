import type { RouteLocationRaw } from 'vue-router'

/** Unsigned SSO visit. `null` stays on the sign-in page. */
export function unsignedSsoRedirect(
  routeName: string | symbol | null | undefined,
): RouteLocationRaw | null {
  if (routeName === 'sign-in') return null
  return { name: 'sign-in', replace: true }
}

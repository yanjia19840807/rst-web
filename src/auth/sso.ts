/** Deployed builds set this so the SPA uses Azure login instead of Dev Identity. */
export function isSsoEnabled() {
  return import.meta.env.VITE_SSO_ENABLED === 'true'
}

export const SSO_AUTH_PATH = '/api/sso/auth'
export const SSO_LOGOUT_PATH = '/api/sso/logout'

const SSO_ERROR_MESSAGES: Record<string, string> = {
  'sso-azure-denied': 'Azure AD denied the sign-in request.',
  'sso-code-missing': 'Authorization code is missing.',
  'sso-ccgid-missing': 'CCGID is missing from the sign-in token.',
  'sso-role-missing': 'SSO role is missing.',
  'sso-role-invalid': 'SSO role is not a RST application role.',
  'sso-env-unconfigured': 'SSO environment is not configured.',
  'sso-env-mismatch': 'SSO role does not match this environment.',
  'sso-timesheet-missing': 'CCGID is not in the ACTIVE Daily Timesheet.',
  'sso-timesheet-role': 'Timesheet role is not AGENT, SUPERVISOR, SR_MANAGER, or DOMAIN_HEAD.',
  'sso-center-invalid': 'Center is missing or is not a GBS China center.',
  'sso-token-exchange': 'Could not complete sign-in with Azure AD.',
  'sso-id-token-missing': 'Azure AD did not return an ID token.',
  'sso-audience-invalid': 'The sign-in token is not for this application.',
  'sso-nonce-invalid': 'The sign-in token nonce does not match.',
  'sso-state-invalid': 'Sign-in session expired. Try again.',
}

let callbackFailed = false

export function isSsoCallbackFailed() {
  return callbackFailed
}

/** Clears the callback-failure latch so a user-initiated Sign in can start Azure again. */
export function resetSsoCallbackFailure() {
  callbackFailed = false
}

export function ssoErrorMessage(code: string | null | undefined) {
  if (!code) return 'Sign-in failed.'
  return SSO_ERROR_MESSAGES[code] ?? `Sign-in failed (${code}).`
}

/**
 * Reads `?ssoError=` from the callback redirect, then strips it from the URL.
 */
export function consumeSsoCallbackError() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const code = params.get('ssoError')
  if (!code) return null
  callbackFailed = true
  params.delete('ssoError')
  const query = params.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', next)
  return ssoErrorMessage(code)
}

/**
 * Starts Azure login. Returns immediately; the browser leaves the SPA.
 */
export function redirectToSso(returnPath?: string) {
  if (typeof window === 'undefined' || callbackFailed) return
  const url = returnPath
    ? `${SSO_AUTH_PATH}?return=${encodeURIComponent(returnPath)}`
    : SSO_AUTH_PATH
  window.location.assign(url)
}

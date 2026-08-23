import { http, HttpResponse } from 'msw'

/** Default MSW identity (single Supervisor) for offline UI. */
export const meHandlers = [
  http.get('*/api/v1/me', () =>
    HttpResponse.json({
      ccgid: 'S00628182',
      displayName: 'YANG Brenda',
      email: 's00628182@dev.local',
      roles: ['SUPERVISOR'],
      scopes: ['TIMESHEET', 'SELF'],
      center: 'Kuala Lumpur',
    }),
  ),
]

import { http, HttpResponse } from 'msw'

/** Default MSW identity (single Supervisor) for offline UI. */
export const meHandlers = [
  http.get('*/api/v1/me', () =>
    HttpResponse.json({
      userId: 'b29c570a-d8df-4a9d-a0dc-8f5ef65deae9',
      ccgid: 'S00628182',
      displayName: 'YANG Brenda',
      email: 's00628182@dev.local',
      roles: ['SUPERVISOR'],
      scopes: ['TIMESHEET', 'SELF'],
    }),
  ),
]

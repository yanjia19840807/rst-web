# RST Web

Vue 3 frontend for the Right Sizing Tool.

## Requirements

- Node.js version from `.nvmrc`
- npm version from `packageManager` in `package.json`

```sh
nvm use
npm install
```

Copy `.env.example` to `.env.local`. Keep `VITE_ENABLE_MSW=true` while developing without
`rst-api`; set it to `false` when a compatible API is available.

## Commands

```sh
npm run dev             # local development
npm run build           # type-check and production build
npm run check           # types, lint, unit tests and build
npm run lint            # read-only lint checks
npm run lint:fix        # apply lint fixes
npm run format          # apply formatting
npm run format:check    # verify formatting
npm run test:unit       # unit tests in watch mode
npm run test:unit:run   # single unit-test run
npm run test:e2e        # Playwright end-to-end tests
```

Install Playwright browsers before the first E2E run:

```sh
npx playwright install
```

## Architecture Rules

- The browser calls `rst-api`; it does not call `rst-forecast` or Microsoft Graph directly.
- Pinia stores client/session state; TanStack Query manages server state.
- Forms use VeeValidate with Zod schemas.
- API clients are generated from the Spring Boot OpenAPI contract with `@hey-api/openapi-ts`.
- shadcn-vue components are copied into `src/components/ui` as needed.
- Business code is grouped by capability under `src/features`; route-level pages only compose
  features and layouts.
- Features must not depend on pages or on another feature's internal files. Move genuinely shared,
  business-neutral code to `src/components`, `src/composables`, or `src/lib`.

## Source Structure

```text
src/
├── api/             # API client and TanStack Query infrastructure
├── assets/          # Global styles and static assets
├── components/      # Business-neutral UI and application layouts
├── features/        # Business capabilities such as TMS, approval, and governance
├── lib/             # Framework-independent utilities
├── pages/           # Route entries that compose features
├── router/          # Route declarations and navigation guards
├── stores/          # Client and session state only
├── App.vue          # Root application shell
└── main.ts          # Application bootstrap
```

Create feature subdirectories only when the implementation needs them. A feature can start with a
single component and grow `api`, `components`, `composables`, and `schemas` directories as required.

## Agent TMS

The first implemented vertical slice follows the Agent workflow from `rst-prototype`:

- `/agent/session` starts, pauses, resumes, and ends timing sessions.
- `/agent/sessions` lists completed sessions with keyword/date filters and server-style pagination.
- `src/features/tms-management` owns the form schema, timer state, Query/Mutation hooks, and UI.
- `src/mocks/handlers/tms.ts` implements the temporary REST contract. Mock state is persisted in
  browser local storage so a refresh restores the running session and any paused sessions. An Agent
  may keep several paused sessions and start a new one; only one session can be running at a time.

MSW is enabled only in Vite development mode. Unit tests use the same handlers through the Node
server adapter, while production builds always call `VITE_API_BASE_URL`.

## Supervisor Toolkit and Exercise

- `/supervisor/toolkits` manages Toolkit hierarchy, Subtasks, `combineSubtasksTime`, Shared KPI
  selections and optimistic-lock `version`.
- Shared KPI is a two-stage choice (Customer Country, then carrier/site/country rows). Delivery HC
  is read-only and recalculated from the ACTIVE Timesheet; it is not part of the save payload.
- `/supervisor/exercises` creates an Exercise and freezes Toolkit, active Subtasks, selected KPI
  rows and Delivery HC from the ACTIVE Timesheet.
- Until login integration is available, route metadata drives the role badge while both Agent and
  Supervisor navigation remain visible for development.

### Temporary REST contract

- `GET /api/v1/toolkits` — Toolkits dynamically visible to the current Agent.
- `GET /api/v1/toolkits/managed` — Toolkits the current principal can manage.
- `POST /api/v1/toolkits` and `GET|PUT|DELETE /api/v1/toolkits/{id}` — Toolkit CRUD;
  update requires `version`, delete is soft-delete.
- `GET /api/v1/timesheet/toolkit-hierarchy` — Center → Domain → PL1 → PL2 → PL3 candidates.
- `GET /api/v1/timesheet/shared-kpi-candidates` — country-filtered rows and dynamic Delivery HC.
- `GET|POST /api/v1/exercises` and
  `GET /api/v1/exercises/{id}` — Exercise list, create-with-freeze, and detail.

Toolkit Shared KPI write payloads contain only `carrier`, `site`, and `customerCountry`. Exercise
snapshots additionally contain the resolved `deliveryHc` and `timesheetSyncDate`.

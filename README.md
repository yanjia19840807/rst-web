# RST Web

Vue 3 frontend for the Right Sizing Tool.

## Requirements

- Node.js version from `.nvmrc`
- npm version from `packageManager` in `package.json`

```sh
nvm use
npm install
```

Copy `.env.example` to `.env.local` and provide the Azure application values.

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

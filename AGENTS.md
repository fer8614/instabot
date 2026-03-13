# AGENTS.md

## Purpose
- This repository is a self-hosted Instagram DM automation service built with Node.js, TypeScript, Express, PostgreSQL, Vitest, and Zod.
- Agents should prefer small, surgical changes that match the existing code style and runtime behavior.
- Keep the app deployable on Railway or any Node 20 compatible host.

## Existing Agent Instructions
- No repository-local Cursor rules were found in `.cursor/rules/`.
- No `.cursorrules` file was found.
- No Copilot instructions file was found at `.github/copilot-instructions.md`.
- Treat this document as the primary local agent guidance unless future repository-specific rule files are added.

## Stack At A Glance
- Runtime: Node.js 20 with pnpm (see `Dockerfile` and `package.json`).
- Language: TypeScript with `strict: true`.
- Module system: `NodeNext`.
- HTTP server: Express.
- Validation: Zod.
- Logging: Pino.
- Database: `postgres` client for PostgreSQL.
- Tests: Vitest in Node environment.

## Important Paths
- App entry: `src/index.ts`
- Env loading and validation: `src/config/env.ts`
- Webhook routes: `src/webhooks/router.ts`
- Signature verification: `src/webhooks/verify.ts`
- Handlers: `src/handlers/*.ts`
- Services: `src/services/*.ts`
- Shared types: `src/types/*.ts`
- Tests: `src/__tests__/*.test.ts`
- Runtime config data: `keywords.json`
- Email templates: `email-templates/`

## Setup Commands
- Install dependencies: `pnpm install`
- Copy env template: `cp .env.example .env`
- Run locally in watch mode: `pnpm dev`

## Build, Run, And Test Commands
- Development server: `pnpm dev`
- Production build: `pnpm build`
- Start built app: `pnpm start`
- Run all tests once: `pnpm test`
- Run tests in watch mode: `pnpm test:watch`
- Run CSV import script: `pnpm import:csv`

## Single-Test Workflows
- Run one test file: `pnpm test -- src/__tests__/keyword.service.test.ts`
- Run one test file directly with Vitest: `pnpm exec vitest run src/__tests__/keyword.service.test.ts`
- Run tests matching a name: `pnpm test -- -t "matches exact keyword"`
- Run a single suite by name: `pnpm exec vitest run -t "matchKeyword -- contains"`
- If you need verbose iteration while editing a single test file: `pnpm exec vitest src/__tests__/keyword.service.test.ts`

## Lint And Format Status
- There is currently no dedicated `lint` script in `package.json`.
- There is currently no dedicated `format` script or formatter config in the repository root.
- Use `pnpm build` as the primary type-safety gate.
- Use `pnpm test` as the primary behavioral gate.
- Do not invent a new lint or formatting tool unless the user asks for it.

## Recommended Validation Sequence
- For small code changes: run `pnpm test` when the touched area is covered.
- For TypeScript source changes: run `pnpm build`.
- For changes affecting webhook or handler behavior: run `pnpm test` and review related handler/service tests.
- For deployment-sensitive changes: ensure `pnpm build` succeeds before finishing.

## Environment Notes
- Environment variables are validated through Zod in `src/config/env.ts`.
- Missing or invalid required env vars are treated as fatal startup errors.
- Do not bypass env validation with ad hoc `process.env` reads in feature code when `getEnv()` or `loadEnv()` should be used.
- Preserve current defaults such as `PORT`, `NODE_ENV`, `LOG_LEVEL`, and email template defaults unless the task requires changing them.

## Architecture Notes
- The server initializes env, keyword rules, JSON parsing, routes, DB, and reminder scheduling in `src/index.ts`.
- Webhook POST requests respond immediately, then process events asynchronously via `setImmediate`.
- Webhook parsing and dispatch live in `src/webhooks/` and `src/handlers/`.
- Data access and third-party integrations live in `src/services/`.
- Shared contracts live in `src/types/` as TypeScript interfaces.
- Keyword behavior is runtime-driven by `keywords.json`; do not hardcode keyword rules in source.

## General Code Style
- Follow the existing TypeScript style already present in `src/`.
- Use single quotes.
- Keep semicolons.
- Use trailing commas in multiline object, array, and function argument lists.
- Prefer 2-space indentation.
- Match the existing spacing and line wrapping in nearby files instead of reformatting unrelated code.
- Keep comments sparse; only add them for non-obvious behavior or protocol constraints.

## Imports
- Use ESM imports with explicit `.js` extensions for local runtime imports, even inside `.ts` files.
- Put Node built-in imports first when present.
- Put third-party imports before local imports.
- Use `import type` for type-only imports.
- Prefer grouped named imports over many one-off import lines when it stays readable.
- Avoid unused imports; keep imports tight and specific.

## Exports And Module Shape
- Prefer named exports for functions, constants, and types.
- Follow the existing pattern of one module owning one cohesive concern.
- Avoid introducing default exports in app code unless there is already a strong local convention for them.
- Keep helper functions local and unexported unless another module truly needs them.

## Types And TypeScript Conventions
- Respect `strict` TypeScript settings.
- Add explicit return types to exported functions.
- Use interfaces for shared object contracts, matching the existing style in `src/types/` and service return models.
- Use narrow unions for finite string states when practical.
- Prefer `null` for explicit absence when existing APIs already return `T | null`.
- Use `NonNullable`, `Awaited`, and `ReturnType` when they simplify handler code without hurting readability.
- Do not weaken types to `any`; use `unknown` plus narrowing if necessary.

## Naming Conventions
- Use `camelCase` for variables, parameters, functions, and object fields in application code.
- Use `PascalCase` for interfaces and type aliases.
- Use `UPPER_SNAKE_CASE` for constants that behave like configuration constants or regex-like globals.
- Keep file names lowercase with dotted role suffixes where established, for example `comment.handler.ts` and `keyword.service.ts`.
- Match existing domain terms exactly: `keywordId`, `senderId`, `igUserId`, `followUp`, `postback`.

## Control Flow And Function Design
- Prefer guard clauses and early returns over deep nesting.
- Keep handlers thin where possible and move reusable logic into services or local helpers.
- Preserve the current sequencing of webhook response first, async processing second.
- Avoid mixing unrelated refactors with behavior changes.
- Keep functions focused on one responsibility.

## Error Handling
- Treat startup failures as fatal when the app cannot operate correctly, for example env validation or DB initialization.
- For request-time or async event failures, catch errors at the boundary, log structured context, and avoid crashing the process.
- Continue non-critical flows when possible, following existing patterns like "log and continue with DM".
- When catching errors, log useful context such as `senderId`, `userId`, `ruleId`, or HTTP status.
- Re-throw only when the caller can make a meaningful decision.
- Avoid swallowing errors silently unless the surrounding pattern already intentionally does so for best-effort logging.

## Logging
- Use the shared `logger` from `src/utils/logger.ts`.
- Prefer structured log metadata objects rather than string concatenation.
- Use log levels consistently: `debug` for internals, `info` for normal lifecycle events, `warn` for recoverable issues, `error` for failures, `fatal` for unrecoverable startup issues.
- Keep log messages short and action-oriented.
- Do not log secrets, tokens, or raw credentials.

## External API And Retry Behavior
- Instagram API calls go through service functions in `src/services/instagram.service.ts`.
- Reuse `withRetry()` for retryable network operations rather than duplicating retry loops.
- Preserve the current rule that most 4xx errors are not retried except 429.
- Keep API payload shapes explicit and close to Meta's expected schema.

## Database Conventions
- Use `getDb()` from `src/services/db.ts` for PostgreSQL access.
- Keep SQL inline with tagged template literals, matching the existing codebase style.
- Preserve snake_case column names in SQL and DB models.
- Keep app-layer DTO fields in camelCase when that is the current local convention.
- Avoid broad schema changes unless requested; this project currently initializes tables imperatively in code.

## Testing Conventions
- Add or update Vitest tests in `src/__tests__/` for behavior changes.
- Follow the current test naming style: `describe()` by module and scenario, `it()` with clear behavior statements.
- Prefer isolated unit tests over tests that require live external services.
- Use temporary files and in-memory state resets when needed, as existing tests already do.
- Keep tests deterministic and free of network dependency.

## File And Change Hygiene
- Do not edit generated output in `dist/`; rebuild instead.
- Be careful when changing `keywords.json` because it affects runtime behavior directly.
- Preserve Spanish user-facing copy unless the task explicitly changes product language.
- Do not casually rename exported symbols or files; handlers and services are organized intentionally.
- Avoid broad formatting-only diffs.

## When In Doubt
- Read neighboring files before introducing a new pattern.
- Prefer consistency with the existing repository over generic framework advice.
- If no lint rule exists, treat the current codebase as the style source of truth.

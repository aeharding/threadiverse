# threadiverse

Unified TypeScript client for threadiverse APIs (Lemmy v0, Lemmy v1, PieFed).
Consumers program against one canonical API; per-software differences live in
providers. Primary consumer: [Voyager](https://github.com/aeharding/voyager)
(usually checked out at `../voyager`).

## Commands

- `pnpm test` — lint + typecheck + vitest with coverage (what CI runs)
- `pnpm vitest run` — tests only
- `pnpm test:types` — `tsc --noEmit`
- `pnpm lint:fix` — auto-fix lint (run after editing; perfectionist sorts
  everything: imports, object keys, class members, union types)
- `pnpm build` — unbuild → `dist/`

## Architecture

Request flow: `ThreadiverseClient` (nodeinfo discovery → picks a provider) →
`SafeClient` wrapper (Zod response validation) → provider (endpoint mapping +
`compat.ts` wire→canonical conversion) → upstream client (`lemmy-js-client`
v0/v1, generated PieFed OpenAPI types).

- `src/BaseClient.ts` — the abstract contract: one method per endpoint, with
  hand-written payload types (`src/types/`). This is where signatures live.
- `src/endpoints.ts` — **single source of truth table**: every `BaseClient`
  method → the Zod schema validating its response (`null` only for
  `Promise<void>` endpoints). `SafeClient` and `ThreadiverseClient` are
  derived from this table at runtime; the mapped type enforces completeness
  and schema/return-type agreement at compile time.
- `src/providers/{lemmyv0,lemmyv1,piefed}/` — `index.ts` implements
  `BaseClient` against the upstream client; `compat.ts` converts wire shapes
  to canonical ones. Endpoints a software can't support throw
  `UnsupportedError`. Methods must be class methods (prototype), never
  arrow-function fields — the derivation loops look them up on the prototype.
- `src/schemas/` — canonical response schemas (Zod v4 mini; import from
  `"zod/v4-mini"`). `src/types/` re-exports `z.infer` types plus the
  hand-written request payload types.
- `src/SafeClient.ts` / `src/ThreadiverseClient.ts` — derived layers; they
  should stay free of per-endpoint code.
- `src/wellknown.ts` — nodeinfo software discovery (validated).
- `src/testing/` — the `threadiverse/testing` subpath export: `FakeInstance`
  (fake server core: discovery, route table, request recording, fetch +
  Playwright adapters) and per-software factories with wire-format builders
  type-checked against the upstream client types.

## Adding an endpoint

1. Declare the method on `BaseClient` (payload type in `src/types/`, response
   schema in `src/schemas/` if new shapes are needed).
2. Add the row to `src/endpoints.ts` (compile error until you do).
3. Implement in all three providers (compile error until you do); throw
   `UnsupportedError` where a software has no equivalent.
4. `test/endpoints-conformance.test.ts` picks it up automatically. Add
   compat-level tests only for tricky wire conversions.

## Conventions

- Canonical API is Lemmy-flavored snake_case; while v0, design decisions
  follow Voyager's needs (see README warning).
- Real servers send JSON `null` where TS types say optional — compat layers
  must tolerate it, and test fixtures should exercise it (`Wire<T>` in
  `src/testing/wire.ts` exists for this).
- Errors: throw the `src/errors.ts` taxonomy (`ResponseError` subclasses with
  the machine-readable code on `.code`/`.message`); never leak upstream
  client errors.
- The PieFed schema is generated — never hand-edit
  `src/providers/piefed/schema.ts`; regenerate per
  `src/providers/piefed/README`.

## Verifying against Voyager

To test local threadiverse inside Voyager, the ONLY supported wiring is:

```sh
cd ../voyager && pnpm i ../threadiverse
```

(never `pnpm link` or `link:` specs; if pnpm fails on an unused
openapi-fetch patch, append `--config.allowUnusedPatches=true`). Build
threadiverse first (`pnpm build`). Then in Voyager: `pnpm test:typecheck`,
`pnpm exec vitest run`, and Playwright specs under `e2e/`. Restore with
`git checkout package.json pnpm-lock.yaml && pnpm i`.

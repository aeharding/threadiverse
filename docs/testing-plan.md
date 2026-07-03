# threadiverse/testing — design & roadmap

Status (2026-07-02): layers 1–3 implemented (seed store + derived routes,
`on`/`once`/`callsTo` with canonical error injection, provider-matrix test
green on lemmyv1 + piefed; error condition taxonomy in #53). Next: fidelity
suite, then Voyager adoption.
Owners: consumer test devex for Voyager and other clients.

## Goal

Consumer tests should describe **what exists and what happens** — never
provider wire formats or HTTP routes. Wire knowledge lives in this package,
type-checked against the same upstream types the compat layers consume, and
**verified against real instances** so the fakes can't drift from reality.

## The three layers

| Layer        | API                             | Use for                                                                                                                                                                                                 |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content      | `fake.seed.*`                   | What exists: people, communities, posts, comments, notifications, logged-in user. All read endpoints derive consistently from one store.                                                                |
| Behavior     | `fake.on.*` / `fake.once.*`     | Per-operation overrides keyed by threadiverse endpoint name (provider-agnostic): error injection (canonical `{ code, status }`), custom wire responses (typed via `fake.build.*`), one-shot sequencing. |
| Escape hatch | `fake.mock(matcher, responder)` | Anything else, at the HTTP route level. Discouraged in consumer specs.                                                                                                                                  |

Request assertions: `fake.callsTo("likePost")` / `fake.waitForCallTo(...)` —
operation-keyed views over the existing recording.

```ts
const fake = new FakeLemmyV1Instance();

// content
const alex = fake.seed.person({ name: "alex" });
fake.seed.post({ name: "Hello **world**", creator: alex });
fake.seed.loggedInAs(alex);

// behavior
fake.once.getSite({ error: { code: "rate_limited", status: 400 } });
fake.on.getPosts({
  json: fake.build.pagedResponse([
    /* custom wire */
  ]),
});
```

### Design decisions

- **Operation → route maps** per provider power `on`/`once`/`callsTo` and
  double as route documentation (kills route-string duplication).
- **Success overrides stay wire-typed** (`fake.build.*`). A general
  canonical→wire reverse-compat layer is deliberately out of scope: it would
  double compat maintenance and is lossy/underdetermined for some fields.
- **Errors are canonical**: `{ code, status? }` renders to each provider's
  error wire shape (Lemmy `{ error }`, PieFed `{ message }`). Error injection
  is the #1 reason specs currently drop to wire level.
- **`once` over stateful writes**: sequencing (fail-then-succeed,
  subscribe-flow state changes) is explicit via one-shot queues. Writes
  mutating the seed store (a fully stateful fake server) is deferred until a
  real spec needs it.

## Fidelity verification (fakes must match reality)

The fakes are only trustworthy if their responses — **especially error
responses** — match what real Lemmy/PieFed instances send. Scheduled e2e in
this repo (extends the live-smoke approach; read-only, polite):

1. **Error fidelity** (`test/live-fidelity.test.ts`): deterministic,
   read-only error probes against live instances — nonexistent community,
   nonexistent user, unauthenticated account endpoint, malformed params.
   For each scenario:
   - capture the real instance's status + error body;
   - render the fake's error for the same scenario;
   - assert same status, same body key-set, same machine-readable code; and
   - drive both through a real `ThreadiverseClient` and assert the identical
     `ResponseError` code surfaces.
2. **Read-path fidelity**: for each derived GET endpoint, fetch a real
   response and the fake's response for an equivalent seed; assert the
   fake's key-set/types are a structural match (allowlist for known
   content-dependent optionals). Both must survive the same compat +
   canonical Zod pipeline.
3. **Recorded snapshots**: sanitized real responses checked in as fixtures
   and refreshed by the scheduled job, so fidelity regressions show up as
   reviewable diffs rather than only red CI.
4. **Later — dockerized instances**: Lemmy 1.0-beta + PieFed via compose for
   write-path fidelity and v1 coverage no public instance provides.
   Separate decision (seed harness maintenance cost).

## Sequencing

1. **Finish `testing-seed-layer`** (this branch): seed store + derived
   routes for both fakes; `on`/`once`/`callsTo` + operation route maps +
   canonical error rendering; provider-matrix round-trip test (seed once,
   assert through the client on both fakes). PR → review → merge.
2. **Fidelity suite** (new PR): error-fidelity scenarios first (highest
   signal, cheapest), then read-path structural checks + snapshots; weekly
   workflow alongside live-smoke.
3. **Voyager adoption branch** (`feat/threadiverse-testing`, in flight):
   rebuild `MockApi` on seed + `on`/`once` (auth via `seed.loggedInAs`,
   inbox via seed notifications), first PieFed e2e specs, `lemmyErrors` →
   `isErrorCode` (done). Parked until release; only needs the version pin.
4. **Release** (end of effort, per policy), then the Voyager PR.
5. **Backlog**: port `lemmyv1-vote-payload`/`lemmyv1-compat` tests onto the
   typed builders; `subscribed`-post/`mod_action` + PieFed notification
   builders; stateful writes if a spec demands it; docker decision.

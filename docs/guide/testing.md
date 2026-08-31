# Testing Your App

`threadiverse/testing` provides **fake instances** for consumer test
suites. Tests describe _what exists and what happens_ rather than provider
routes or wire shapes, so the same spec text runs against every provider.

```ts
import { FakeLemmyV1Instance, FakePiefedInstance } from "threadiverse/testing";
```

[`FakeLemmyV1Instance`](/api/testing/classes/FakeLemmyV1Instance) and
[`FakePiefedInstance`](/api/testing/classes/FakePiefedInstance) share the same
core fake-instance API (both extend
[`FakeInstance`](/api/testing/classes/FakeInstance)); their supported
operations and wire builders remain provider-specific. Wire knowledge lives
inside this package, type-checked against the same upstream types the compat
layers consume. Selected behavior is also checked against real instances (see
[Fidelity verification](#fidelity-verification)).

## Quick start

```ts
import { ThreadiverseClient } from "threadiverse";
import { FakeLemmyV1Instance } from "threadiverse/testing";

const fake = new FakeLemmyV1Instance();

// Content: supported seed-backed read endpoints derive from the store
const alex = fake.seed.person({ name: "alex" });
fake.seed.post({ name: "Hello **world**", creator: alex });
fake.seed.loggedInAs(alex);

// Behavior: override by threadiverse endpoint name
fake.once.getPosts({ error: { code: "rate_limit_error", status: 429 } });

// Unit tests: clientOptions() routes fetch through the fake
const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
```

## The three layers

| Layer        | API                                                                       | Use for                                                                               |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Content      | [`fake.seed.*`](/api/testing/classes/SeedStore)                           | What exists: people, communities, posts, comments, notifications, the logged-in user. |
| Behavior     | `fake.on.*` / `fake.once.*`                                               | Per-operation overrides: error injection, custom wire responses, one-shot sequencing. |
| Escape hatch | [`fake.mock(matcher, responder)`](/api/testing/classes/FakeInstance#mock) | Anything else, at the HTTP route level. Discouraged in consumer specs.                |

Use the highest layer that expresses the spec's intent; `mock` is a
route-level escape hatch, not the primary interface.

## Content: the seed store

`fake.seed` is a [`SeedStore`](/api/testing/classes/SeedStore) — a semantic
content store. Seed what exists, and **supported seed-backed read endpoints
derive from it consistently** — feeds, post detail, comments, site counts,
profiles, notifications:

```ts
const alex = fake.seed.person({ displayName: "Alex", name: "alex" });
const cats = fake.seed.community({ name: "cats", title: "Cats" });

const post = fake.seed.post({
  name: "Hello **world**",
  body: "look at this **cat**",
  community: cats,
  creator: alex,
});

fake.seed.comment({ content: "First!", post });
fake.seed.site({ name: "Fake instance" });

// Authentication state
fake.seed.loggedInAs(alex);

// Inbox: seeds the message and its notification together
fake.seed.privateMessage({ content: "hey!", creator: someoneElse });
```

Omitted relations are defaulted: a `post` with no `community` lands in the
first seeded (or an auto-created) community, a `comment` with no `post`
attaches to the first post, and so on.

Because both fakes derive from the same `SeedStore` semantics, you can run
one scenario against every provider:

```ts
describe.each([
  ["lemmyv1", () => new FakeLemmyV1Instance()],
  ["piefed", () => new FakePiefedInstance()],
] as const)("%s", (mode, makeFake) => {
  it("shows the seeded post", async () => {
    const fake = makeFake();
    fake.seed.post({ name: "Hello **world**" });

    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    const { data: posts } = await client.getPosts({});
    expect(posts.map((view) => view.post.name)).toEqual(["Hello **world**"]);
  });
});
```

## Behavior: `on`, `once`, and canonical errors

Overrides are keyed by **threadiverse endpoint name** — `getPosts`,
`likePost`, `getSite` — never provider routes. `on` replaces an operation's
response until changed; `once` overrides only the next call, then falls
back (to an earlier `on`, or to the seed-derived default).

### Error injection

Errors are canonical: describe the condition as `{ code, status? }`
([`ErrorInjection`](/api/testing/type-aliases/ErrorInjection)) and the fake
renders each provider's error wire shape (Lemmy `{ error }`, PieFed
`{ message }`). Your spec then asserts the same condition class either way:

```ts
import { RateLimitedError } from "threadiverse";

fake.once.getPosts({ error: { code: "rate_limit_error", status: 429 } });

await expect(client.getPosts({})).rejects.toBeInstanceOf(RateLimitedError);

// next call falls back to the seed-derived response
await client.getPosts({});
```

### Sequencing

`once` calls queue, making fail-then-succeed flows explicit:

```ts
fake.once.getPosts({ error: { code: "rate_limit_error", status: 429 } });
// first attempt fails; retry uses the seed-derived feed
```

### Custom wire responses

When a spec genuinely needs a response the seed store can't express,
success overrides stay **wire-typed** via `fake.build.*` — builders bound
to the fake's host, type-checked against the provider's real API types:

```ts
fake.on.getPosts({
  json: fake.build.pagedResponse([
    /* provider wire objects, typed */
  ]),
});
```

There is deliberately no canonical→wire reverse layer for successes — it
would double compat maintenance and is lossy for some fields. Frequent use
of `build` in specs is a signal the seed store should grow a new noun
instead.

## Asserting requests

Assert on outgoing requests as **canonical payloads** — what your app
_meant_, decoded from the wire and round-trip tested per provider:

```ts
// Works before or after the request: returns the latest matching payload,
// or waits when none has been recorded yet
const payload = await fake.waitForPayload("likePost");
// { post_id: 1, is_upvote: true }

// When ordering matters, ignore history and wait strictly for the next one
const nextPayload = await fake.waitForNextPayload("likePost");

// Or inspect everything an operation has received
const calls = fake.callsTo("likePost");
expect(calls).toHaveLength(1);
```

Both waiters accept an optional predicate for a specific matching request.
The same distinction exists at the wire level as `waitForCall` versus
`waitForNextCall`. All are part of the per-operation
[`OperationApi`](/api/testing/interfaces/OperationApi), alongside `on` and
`once`.

## Wiring it up

### Unit tests (vitest, jest, …)

[`clientOptions()`](/api/testing/classes/FakeInstance#clientoptions)
returns
[`ThreadiverseClientOptions`](/api/index/interfaces/ThreadiverseClientOptions)
that route fetch through the fake and scope software discovery, keeping
tests isolated from each other:

```ts
const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
```

For app code that constructs its own client,
[`fake.fetch`](/api/testing/classes/FakeInstance#properties) is a bound fetch
implementation you can install as a global fetch mock.

### Playwright / e2e

[`install(page)`](/api/testing/classes/FakeInstance#install) routes all
traffic for the fake's origin; other origins are untouched:

```ts
await fake.install(page);
await page.goto("/");
// your app now talks to the fake
```

Point your app at `fake.origin` (e.g. `https://v1.test.lemmy`) and drive
the UI; combine with `waitForPayload` to assert what the app sent.

### Unmocked requests

Requests to the fake's host that no seed route or override handles return
`501` with a console warning (`[FakeInstance] unmocked request: …`), and
`fake.fetch` throws a `TypeError` for foreign-origin requests. The Playwright
`install(page)` adapter leaves foreign origins untouched.

## Fidelity verification

The fakes are verified against reality in two ways:

- Wire shapes are **type-checked against the same upstream API types** the
  compat layers use (`lemmy-js-client`, PieFed's Swagger).
- A weekly scheduled suite probes selected read-only error scenarios against
  live Lemmy and PieFed instances, checking that real and fake clients surface
  the same `ResponseError` subclass and, when the real provider exposes one,
  the same HTTP status.

Maintainers can also run the authenticated acceptance suite against disposable
Voyager test accounts:

```sh
LIVE_AUTH=1 pnpm vitest run test/live-authenticated.test.ts
```

It reads the ignored project-root `.test-creds.json` by default;
`THREADIVERSE_TEST_CREDS` can select another file and
`THREADIVERSE_TEST_ACCOUNT` one account by key. With no account selector, it
exercises every configured account. Keep the file owner-only (`chmod 600
.test-creds.json`); the exact root filename is ignored by git. The existing
shared-instance shape remains supported:

```json
{
  "instance": "lemmy.example",
  "accounts": {
    "test-user": "password"
  }
}
```

To cover more than one provider in the same run, put the instance on each
account record (the record key is only a selector; `username` is sent to the
server):

```json
{
  "accounts": {
    "lemmy": {
      "instance": "lemmy.example",
      "username": "test-user",
      "password": "password"
    },
    "piefed": {
      "instance": "piefed.example",
      "username": "test-user",
      "password": "password"
    }
  }
}
```

Secrets are loaded only at runtime and failures are redacted. The suite has an
explicit endpoint requirement matrix for each provider mode and exercises
login, logout, and authenticated/person-scoped reads against the real APIs. It
does not make persistent content mutations.

Successful authentication and route existence are reported separately. Until
a PieFed test account is configured, safe unauthenticated probes still check
the real PieFed login/logout, notification-state, report, and community
ban/unban routes and HTTP methods: only expected `4xx` auth/validation
rejections pass; `404`, `405`, and `501` fail. The route-only run also performs
a successful public canonical profile-feed read. Run that coverage without any
credential file with:

```sh
LIVE_PIEFED_ROUTES=1 pnpm vitest run test/live-authenticated.test.ts
```

`THREADIVERSE_PIEFED_ROUTE_INSTANCE` overrides the default
`https://piefed.social` probe target.

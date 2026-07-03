<p align="center">
<img src="./logo.jpg" width="350">
</p>

<h1 align="center">threadiverse</h1>

<p align="center">
Unified typescript client for threadiverse APIs (Lemmy, Piefed, Mbin etc)
</p>

> [!WARNING]
> **Early Development Stage**: This project is under active development and may undergo significant API changes between versions. While v0, this project's design decisions will be guided by [Voyager](https://github.com/aeharding/voyager)'s usage.

## Features

- 🧙‍♂️ Automagic software detection via `.well-known`
- 📦 API support:
  - ✅ Lemmy v0
  - ⚠️ Lemmy v1 - in development
  - ⚠️ Piefed - partial, experimental
  - ❌ Mbin - no support yet (PRs welcome!)
- 🛑 Guaranteed response types via runtime Zod schema validation
- 🛡️ Strongly typed internally: Uses official software types (Swagger from Piefed, `lemmy-js-client` from Lemmy) to enforce compat layer type correctness

## Example

This project provides a `ThreadiverseClient` class which you can use similarly to [`lemmy-js-client`](https://github.com/LemmyNet/lemmy-js-client)'s `LemmyHttp` class. For the most part, it should be a drop-in replacement.

```sh
pnpm i threadiverse
```

```ts
import { ThreadiverseClient } from "threadiverse";

const client = new ThreadiverseClient("https://lemmy.world");

const posts = await client.getPosts();
```

## Testing your app

`threadiverse/testing` provides fake instances for consumer test suites, so
your tests describe _what exists and what happens_ — never provider routes
or wire shapes. The same test text works against every provider.

```ts
import { FakeLemmyV1Instance } from "threadiverse/testing";
// ...or FakePiefedInstance — the API below is identical

const fake = new FakeLemmyV1Instance();

// Content: seed it; every read endpoint (feeds, post detail, comments,
// site counts, profiles, notifications) derives from the store
const alex = fake.seed.person({ name: "alex" });
fake.seed.post({ name: "Hello **world**", creator: alex });
fake.seed.loggedInAs(alex);

// Behavior: override by threadiverse endpoint name; errors are canonical
fake.once.getPosts({ error: { code: "rate_limit_error", status: 429 } });

// Unit tests: clientOptions() routes fetch through the fake and keeps
// software discovery isolated from other tests
const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

// Playwright: route all traffic for the fake host
await fake.install(page);

// Assert on outgoing requests as canonical payloads — what your app
// *meant*, decoded from the wire and round-trip tested per provider
const payload = await fake.waitForPayload("likePost");
// { post_id: 1, is_upvote: true }
```

Fidelity is enforced, not assumed: wire shapes are type-checked against the
same upstream API types the compat layers use, and a scheduled suite
verifies the fakes' responses — especially error responses — against live
Lemmy and PieFed instances.

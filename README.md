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

`threadiverse/testing` provides a fake instance for consumer test suites, so
you don't have to hand-maintain wire-format fixtures or discovery mocks. Wire
shapes are type-checked against the same upstream API types the compat layer
uses, so fixtures can't silently drift.

```ts
import { FakeLemmyV1Instance } from "threadiverse/testing";

const instance = new FakeLemmyV1Instance({ host: "fake.lemmy.test" });

instance.mock("GET /api/v4/post/list", {
  json: instance.build.pagedResponse([
    instance.build.postView({
      id: 1,
      name: "Hello world",
      creator: instance.build.person({ id: 100, name: "alex" }),
    }),
  ]),
});

// Unit tests: pass instance.fetch as fetchFunction
const client = new ThreadiverseClient(instance.origin, {
  fetchFunction: instance.fetch,
});

// Playwright: route all traffic for the fake host
await instance.install(page);

// Assert on outgoing requests
const call = await instance.waitForCall("GET /api/v4/post/list");
```

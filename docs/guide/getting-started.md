# Getting Started

`threadiverse` is a unified typescript client for threadiverse instances —
Lemmy and PieFed, with Mbin unsupported so far. You write against one API;
the client detects the instance's software and translates.

## Installation

::: code-group

```sh [pnpm]
pnpm i threadiverse
```

```sh [npm]
npm i threadiverse
```

```sh [yarn]
yarn add threadiverse
```

:::

## Usage

The package exports one main class,
[`ThreadiverseClient`](/api/index/classes/ThreadiverseClient):

```ts
import { ThreadiverseClient } from "threadiverse";

const client = new ThreadiverseClient("https://lemmy.world");

const { data: posts } = await client.getPosts();
```

The first API call resolves the instance's software via
`.well-known/nodeinfo` and selects the matching provider.

Method names and payload shapes follow
[`lemmy-js-client`](https://github.com/LemmyNet/lemmy-js-client)'s
`LemmyHttp`, so for existing Lemmy apps it is mostly a drop-in replacement.

## Software support

| Software | Status                           |
| -------- | -------------------------------- |
| Lemmy v0 | ✅ Supported                     |
| Lemmy v1 | ⚠️ In development                |
| PieFed   | ⚠️ Partial, experimental         |
| Mbin     | ❌ No support yet (PRs welcome!) |

## Behavior guarantees

- **Software detection** — nodeinfo discovery, cached per hostname.
- **Runtime response validation** — every response is validated with Zod;
  a response that doesn't match the canonical shape rejects with
  [`UnexpectedResponseError`](/api/index/classes/UnexpectedResponseError).
- **Normalized errors** — provider-specific error codes map onto condition
  classes ([`NotFoundError`](/api/index/classes/NotFoundError),
  [`RateLimitedError`](/api/index/classes/RateLimitedError), …) that behave
  the same across software. See [Error handling](./client#error-handling).
- **Fake instances for tests** — `threadiverse/testing` provides fake Lemmy
  and PieFed instances
  ([`FakeLemmyV1Instance`](/api/testing/classes/FakeLemmyV1Instance),
  [`FakePiefedInstance`](/api/testing/classes/FakePiefedInstance)) for
  consumer test suites. See [Testing Your App](./testing).

## Next steps

- [Using the Client](./client) — auth, discovery, pagination, errors
- [Testing Your App](./testing) — the fake-instance framework
- [API Reference](/api/) — every endpoint and type

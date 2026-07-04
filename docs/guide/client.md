# Using the Client

## Construction

```ts
import { ThreadiverseClient } from "threadiverse";

const client = new ThreadiverseClient("https://piefed.social");
```

Construction is synchronous; no network requests occur until the first
call. Options
([`ThreadiverseClientOptions`](/api/index/interfaces/ThreadiverseClientOptions)):

```ts
const client = new ThreadiverseClient("https://lemmy.world", {
  // Provide your own fetch (SSR, node, custom retries)
  fetchFunction: fetch,

  // Sent with every request — this is how you authenticate
  headers: { Authorization: `Bearer ${jwt}` },

  // Scope software-discovery caching (see below)
  discoveryCache: new Map(),
});
```

## Software discovery

The client resolves the instance's software from `.well-known/nodeinfo` and
selects a provider (Lemmy v0, Lemmy v1, or PieFed). This happens implicitly
on the first API call, or explicitly with
[`connect()`](/api/index/classes/ThreadiverseClient#connect) for
introspection before making requests:

```ts
const { mode, software } = await client.connect();

mode; // "lemmyv0" | "lemmyv1" | "piefed"
software; // { name: "lemmy" | "piefed", version: "0.19.5" }
```

After a connection is established (any resolved call counts), the sync
getters [`client.mode`](/api/index/classes/ThreadiverseClient#mode) and
[`client.software`](/api/index/classes/ThreadiverseClient#software) work
too.

Discovery results are cached per hostname in a process-wide cache by
default. Pass your own `Map` as `discoveryCache` to scope it — useful
server-side or in tests:

```ts
const cache = new Map();
const a = new ThreadiverseClient("https://lemmy.world", {
  discoveryCache: cache,
});
```

## Authentication

[`login()`](/api/index/classes/ThreadiverseClient#login) returns a JWT;
construct an authenticated client with it as an `Authorization` header:

```ts
const anonymous = new ThreadiverseClient("https://lemmy.world");

const { jwt } = await anonymous.login({
  username_or_email: "alex",
  password: "hunter2",
  totp_2fa_token: token, // when the account has 2FA
});

const client = new ThreadiverseClient("https://lemmy.world", {
  headers: { Authorization: `Bearer ${jwt}` },
});
```

## Endpoints

Every endpoint is an async method on the client, named and shaped like
`lemmy-js-client`'s `LemmyHttp`: `getPosts`, `getComments`, `createComment`,
`likePost`, `followCommunity`, `search`, `getNotifications`, `getModlog`,
`uploadImage`, etc. — around sixty in total. The endpoint surface is
declared on [`BaseClient`](/api/index/classes/BaseClient), which every
provider implements; see the
[`ThreadiverseClient`](/api/index/classes/ThreadiverseClient) reference for
the full method list with payload and response types.

```ts
const { post_view } = await client.getPost({ id: 123 });

await client.createComment({
  post_id: post_view.post.id,
  content: "Nice post!",
});

await client.likePost({ post_id: post_view.post.id, score: 1 });
```

Every method also accepts trailing
[`RequestOptions`](/api/index/type-aliases/RequestOptions), e.g. for
cancellation:

```ts
const controller = new AbortController();
await client.getPosts({}, { signal: controller.signal });
```

## Pagination

List endpoints take [`PageParams`](/api/index/type-aliases/PageParams) and
return a uniform
[pagable shape](/api/index/interfaces/PagableResponse) regardless of
software:

```ts
const page1 = await client.getPosts({ limit: 20 });
page1.data; // PostView[]

if (page1.next_page) {
  const page2 = await client.getPosts({
    limit: 20,
    page_cursor: page1.next_page,
  });
}
```

`page_cursor` is opaque (`string | number`) — always thread through the
`next_page` you were handed rather than computing page numbers.

## Response validation

Every response is validated against a Zod schema before it reaches you. If
an instance returns something that doesn't match the canonical shape, the
call rejects with
[`UnexpectedResponseError`](/api/index/classes/UnexpectedResponseError)
instead of silently handing you malformed data.

## Error handling

Failed API calls reject with
[`ResponseError`](/api/index/classes/ResponseError) (or a subclass). The
**class encodes the condition** — providers normalize their native error
codes onto condition subclasses, so `instanceof` checks work identically
across Lemmy and PieFed:

```ts
import {
  IncorrectLoginError,
  NotFoundError,
  RateLimitedError,
  ResponseError,
} from "threadiverse";

try {
  await client.getCommunity({ name: "does_not_exist" });
} catch (error) {
  switch (true) {
    case error instanceof NotFoundError:
      // community doesn't exist
      break;
    case error instanceof RateLimitedError:
      // back off
      break;
    case error instanceof ResponseError:
      // any other server-reported error; error.code has the
      // machine-readable code for the long tail
      console.error(error.code);
      break;
    default:
      throw error;
  }
}
```

Condition subclasses:
[`NotFoundError`](/api/index/classes/NotFoundError),
[`RateLimitedError`](/api/index/classes/RateLimitedError),
[`IncorrectLoginError`](/api/index/classes/IncorrectLoginError),
[`Incorrect2faError`](/api/index/classes/Incorrect2faError),
[`Missing2faError`](/api/index/classes/Missing2faError),
[`BannedError`](/api/index/classes/BannedError),
[`AccountDeletedError`](/api/index/classes/AccountDeletedError),
[`EmailNotVerifiedError`](/api/index/classes/EmailNotVerifiedError),
[`RegistrationApplicationPendingError`](/api/index/classes/RegistrationApplicationPendingError),
[`CantBlockAdminError`](/api/index/classes/CantBlockAdminError), and
[`InvalidBotActionError`](/api/index/classes/InvalidBotActionError).

For the long tail without a dedicated class, match on `error.code`
(a machine-readable
[`ResponseErrorCode`](/api/index/type-aliases/ResponseErrorCode) like
`"rate_limited"`) — prefer the condition classes when one exists.

Non-response failures have their own classes under the common
[`FediverseError`](/api/index/classes/FediverseError) base:
[`UnexpectedResponseError`](/api/index/classes/UnexpectedResponseError)
(response failed schema validation),
[`InvalidPayloadError`](/api/index/classes/InvalidPayloadError),
[`UnsupportedError`](/api/index/classes/UnsupportedError), and
[`UnsupportedSoftwareError`](/api/index/classes/UnsupportedSoftwareError)
(instance runs software this library doesn't support).

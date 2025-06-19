# threadiverse

Unified typescript client for threadiverse instances (Lemmy, Piefed, Mbin etc)

> [!WARNING] > **Early Development Stage**: This project is under active development and may undergo significant API changes between versions. While v0, this project's design decisions will be guided by [Voyager](https://github.com/aeharding/voyager)'s usage.

## Features

- 🧙‍♂️ Automagic software detection via `.well-known`
- 📦 Supported threadiverse APIs:
  - ✅ Lemmy - full suppport (soon!)
  - ⚠️ Piefed - partial, uber-experimental support
  - ❌ Mbin/Kbin - no support yet (PRs welcome!)
- 🛡️ Strongly typed internally: Uses official software types (Swagger from Piefed, `lemmy-js-client` from Lemmy) to enforce compat layer type correctness
- 💭 Potential future feature: Compat layer for breaking changes in threadiverse APIs

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

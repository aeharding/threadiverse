---
layout: home

hero:
  name: threadiverse
  text: Unified typescript client for threadiverse instances
  tagline: One API for Lemmy and PieFed, with runtime-validated responses and fake instances for consumer test suites.
  image:
    src: /logo.jpg
    alt: threadiverse
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Testing Your App
      link: /guide/testing
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🧙‍♂️
    title: Automatic software detection
    details: The instance's software is resolved via <code>.well-known/nodeinfo</code> and the matching provider (Lemmy v0, Lemmy v1, PieFed) is selected. Results are cached per hostname.
  - icon: 🛑
    title: Runtime response validation
    details: Every response is validated against a Zod schema. A response that doesn't match the canonical shape rejects with <code>UnexpectedResponseError</code>.
  - icon: 🛡️
    title: Typed compat layers
    details: Providers are type-checked against each software's official types (<code>lemmy-js-client</code>, PieFed's Swagger), so upstream API drift is a compile error.
  - icon: 🧪
    title: Fake instances for testing
    details: <code>threadiverse/testing</code> ships fake Lemmy and PieFed instances — seed content, inject errors, assert request payloads — with one API across providers.
  - icon: 📄
    title: Uniform pagination
    details: All list endpoints return cursor-based <code>{ data, next_page }</code> responses, regardless of the underlying software's pagination scheme.
  - icon: 🔁
    title: LemmyHttp-compatible API
    details: Method names and payload shapes follow <code>lemmy-js-client</code>'s <code>LemmyHttp</code>, so it is mostly a drop-in replacement.
---

## Install

```sh
pnpm i threadiverse
```

```ts
import { ThreadiverseClient } from "threadiverse";

const client = new ThreadiverseClient("https://lemmy.world");

const { data: posts } = await client.getPosts();
```

> [!WARNING]
> **Early development stage**: this project is under active development and may undergo significant API changes between versions. While v0, design decisions are guided by [Voyager](https://github.com/aeharding/voyager)'s usage.

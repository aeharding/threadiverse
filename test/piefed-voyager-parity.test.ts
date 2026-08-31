import { describe, expect, it, vi } from "vitest";

import type { BaseClientOptions } from "../src/BaseClient";
import type { components } from "../src/providers/piefed/schema";
import type { Wire } from "../src/testing/wire";

import { InvalidPayloadError, ResponseError } from "../src/errors";
import PiefedClient, { UnsafePiefedClient } from "../src/providers/piefed";
import { createPiefedBuilders } from "../src/testing/piefed/builders";

const BASE_URL = "https://piefed.example.com";
const build = createPiefedBuilders({ host: "piefed.example.com" });

type Schemas = components["schemas"];

const creator = build.person({ id: 10, user_name: "voyager" });
const postView = build.postView({
  creator,
  id: 20,
  title: "Voyager parity",
});
const commentView = {
  ...build.commentView({
    body: "A moderator comment",
    creator,
    id: 30,
    post: postView,
  }),
  comment: {
    ...build.commentView({
      body: "A moderator comment",
      creator,
      id: 30,
      post: postView,
    }).comment,
    distinguished: true,
  },
} satisfies Wire<Schemas["CommentView"]>;

const communityResponse = {
  community_view: build.communityView({ community: postView.community }),
  discussion_languages: [0],
} satisfies Wire<Schemas["CommunityResponse"]>;

const postResponse = {
  post_view: postView,
} satisfies Wire<Schemas["GetPostResponse"]>;

const metadataResponse = {
  metadata: {
    description: "A page used by Voyager's post composer",
    embed_video_url: "",
    image: "https://example.com/card.png",
    title: "Example title",
  },
} satisfies Wire<Schemas["GetSiteMetadataResponse"]>;

const deleteResponse = {
  result: "ok",
} satisfies Wire<Schemas["ImageDeleteResponse"]>;

function setup(response: unknown) {
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Response.json(response);
    },
  ) as BaseClientOptions["fetchFunction"];

  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: { Authorization: "Bearer test-token" },
  });

  return { client, requests };
}

function signalFor(request: Request, controller: AbortController) {
  expect(request.signal.aborted).toBe(false);
  controller.abort();
  expect(request.signal.aborted).toBe(true);
}

describe("PieFed Voyager parity wire contracts", () => {
  it("maps distinguishComment to PieFed's comment-reply id and canonical response", async () => {
    const response = {
      comment_view: commentView,
    } satisfies Wire<Schemas["GetCommentResponse"]>;
    const { client, requests } = setup(response);
    const controller = new AbortController();

    const result = await client.distinguishComment(
      { comment_id: 30, distinguished: true },
      { signal: controller.signal },
    );

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/comment/distinguish`);
    await expect(request.clone().json()).resolves.toEqual({
      comment_reply_id: 30,
      distinguished: true,
    });
    expect(result.comment_view.comment).toMatchObject({
      distinguished: true,
      id: 30,
    });
    signalFor(request, controller);
  });

  it.each([
    ["all_posts", true],
    ["replies_and_mentions", false],
  ] as const)(
    "maps the exact community notification mode %s",
    async (mode, subscribe) => {
      const { client, requests } = setup(communityResponse);
      const controller = new AbortController();

      await expect(
        client.editCommunityNotifications(
          { community_id: 40, mode },
          { signal: controller.signal },
        ),
      ).resolves.toBeUndefined();

      const request = requests[0]!;
      expect(request.method).toBe("PUT");
      expect(request.url).toBe(`${BASE_URL}/api/alpha/community/subscribe`);
      await expect(request.clone().json()).resolves.toEqual({
        community_id: 40,
        subscribe,
      });
      signalFor(request, controller);
    },
  );

  it.each(["all_posts_and_comments", "mute"] as const)(
    "rejects community notification mode %s, which PieFed cannot represent",
    async (mode) => {
      const { client, requests } = setup(communityResponse);

      await expect(
        client.editCommunityNotifications({ community_id: 40, mode }),
      ).rejects.toBeInstanceOf(InvalidPayloadError);
      expect(requests).toHaveLength(0);
    },
  );

  it.each([
    ["all_comments", true],
    ["replies_and_mentions", false],
  ] as const)(
    "maps the exact post notification mode %s",
    async (mode, subscribe) => {
      const { client, requests } = setup(postResponse);
      const controller = new AbortController();

      await expect(
        client.editPostNotifications(
          { mode, post_id: 20 },
          { signal: controller.signal },
        ),
      ).resolves.toBeUndefined();

      const request = requests[0]!;
      expect(request.method).toBe("PUT");
      expect(request.url).toBe(`${BASE_URL}/api/alpha/post/subscribe`);
      await expect(request.clone().json()).resolves.toEqual({
        post_id: 20,
        subscribe,
      });
      signalFor(request, controller);
    },
  );

  it("rejects post mute because PieFed still delivers direct replies and mentions", async () => {
    const { client, requests } = setup(postResponse);

    await expect(
      client.editPostNotifications({ mode: "mute", post_id: 20 }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    expect(requests).toHaveLength(0);
  });

  it("deletes the authenticated user's exact uploaded URL", async () => {
    const { client, requests } = setup(deleteResponse);
    const controller = new AbortController();

    await expect(
      client.deleteImage(
        {
          delete_token: "lemmy-only-token",
          url: "https://piefed.example.com/media/image.png",
        },
        { signal: controller.signal },
      ),
    ).resolves.toBeUndefined();

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/image/delete`);
    await expect(request.clone().json()).resolves.toEqual({
      file: "https://piefed.example.com/media/image.png",
    });
    signalFor(request, controller);
  });

  it.each([
    { delete_token: "secret-delete-token", url: "" },
    { delete_token: "secret-delete-token", url: "not a URL" },
    { delete_token: "secret-delete-token", url: "ftp://example.com/image" },
    {
      delete_token: 123 as unknown as string,
      url: "https://example.com/image",
    },
  ])(
    "rejects invalid image deletion payloads without leaking them",
    async (payload) => {
      const { client, requests } = setup(deleteResponse);

      const error = await client
        .deleteImage(payload)
        .catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(InvalidPayloadError);
      const invalidPayloadError = error as InvalidPayloadError;
      expect(invalidPayloadError.message).toBe(
        "Invalid PieFed image deletion payload",
      );
      expect(invalidPayloadError.message).not.toContain(
        String(payload.delete_token),
      );
      if (payload.url)
        expect(invalidPayloadError.message).not.toContain(payload.url);
      expect(requests).toHaveLength(0);
    },
  );

  it("does not expose PieFed image credentials in response errors", async () => {
    const secretUrl = "https://piefed.example.com/media/private-image-name";
    const secretToken = "private-delete-token";
    const requests: Request[] = [];
    const fetchFunction = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(new Request(input, init));
        return Response.json(
          { message: "operation_denied" },
          { status: 400, statusText: "Bad Request" },
        );
      },
    ) as BaseClientOptions["fetchFunction"];
    const client = new UnsafePiefedClient(BASE_URL, {
      fetchFunction,
      headers: {},
    });

    const error = await client
      .deleteImage({ delete_token: secretToken, url: secretUrl })
      .catch((cause: unknown) => cause);
    const serializedError = JSON.stringify(error);

    expect(error).toBeInstanceOf(ResponseError);
    expect(serializedError).not.toContain(secretToken);
    expect(serializedError).not.toContain(secretUrl);
    expect(requests).toHaveLength(1);
  });

  it("fetches public site metadata with the URL as a query parameter", async () => {
    const { client, requests } = setup(metadataResponse);
    const controller = new AbortController();

    const result = await client.getSiteMetadata(
      { url: "https://example.com/article?a=1&b=2" },
      { signal: controller.signal },
    );

    const request = requests[0]!;
    expect(request.method).toBe("GET");
    expect(request.url).toBe(
      `${BASE_URL}/api/alpha/post/site_metadata?url=https%3A%2F%2Fexample.com%2Farticle%3Fa%3D1%26b%3D2`,
    );
    expect(result).toEqual(metadataResponse);
    signalFor(request, controller);
  });

  it("forwards the request signal when fetching federated instances", async () => {
    const response = {
      federated_instances: { allowed: [], blocked: [], linked: [] },
    } satisfies Wire<Schemas["GetFederatedInstancesResponse"]>;
    const { client, requests } = setup(response);
    const controller = new AbortController();

    await expect(
      client.getFederatedInstances({ signal: controller.signal }),
    ).resolves.toEqual({
      federated_instances: { allowed: [], blocked: [], linked: [] },
    });

    const request = requests[0]!;
    expect(request.method).toBe("GET");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/federated_instances`);
    signalFor(request, controller);
  });

  it("accepts metadata responses with every optional field absent", async () => {
    const response = {
      metadata: {},
    } satisfies Wire<Schemas["GetSiteMetadataResponse"]>;
    const requests: Request[] = [];
    const fetchFunction = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(new Request(input, init));
        return Response.json(response);
      },
    ) as BaseClientOptions["fetchFunction"];
    const client = new PiefedClient(BASE_URL, {
      fetchFunction,
      headers: {},
    });

    await expect(
      client.getSiteMetadata({ url: "https://example.com/no-open-graph" }),
    ).resolves.toEqual({ metadata: {} });
    expect(requests).toHaveLength(1);
  });

  it("maps PieFed activity-alert state back to the exact canonical modes", async () => {
    const activeCommunityResponse = {
      ...build.communityResponse({ community: postView.community }),
      community_view: {
        ...build.communityView({ community: postView.community }),
        activity_alert: true,
      },
    } satisfies Wire<Schemas["GetCommunityResponse"]>;
    const activePostResponse = {
      post_view: {
        ...postView,
        activity_alert: true,
      },
    } satisfies Wire<Schemas["GetPostResponse"]>;

    const community = await setup(activeCommunityResponse).client.getCommunity({
      id: postView.community.id,
    });
    const post = await setup(activePostResponse).client.getPost({ id: 20 });

    expect(community.community_view.notifications).toBe("all_posts");
    expect(post.post_view.notifications).toBe("all_comments");

    const inactiveCommunity = await setup(
      build.communityResponse({ community: postView.community }),
    ).client.getCommunity({ id: postView.community.id });
    const inactivePost = await setup(postResponse).client.getPost({ id: 20 });

    expect(inactiveCommunity.community_view.notifications).toBe(
      "replies_and_mentions",
    );
    expect(inactivePost.post_view.notifications).toBe("replies_and_mentions");
  });

  it.each([
    [
      "distinguishComment",
      (client: UnsafePiefedClient) =>
        client.distinguishComment({ comment_id: 30, distinguished: true }),
    ],
    [
      "editCommunityNotifications",
      (client: UnsafePiefedClient) =>
        client.editCommunityNotifications({
          community_id: 40,
          mode: "all_posts",
        }),
    ],
    [
      "editPostNotifications",
      (client: UnsafePiefedClient) =>
        client.editPostNotifications({ mode: "all_comments", post_id: 20 }),
    ],
    [
      "deleteImage",
      (client: UnsafePiefedClient) =>
        client.deleteImage({ delete_token: "", url: "https://example.com/a" }),
    ],
    [
      "getSiteMetadata",
      (client: UnsafePiefedClient) =>
        client.getSiteMetadata({ url: "https://example.com" }),
    ],
  ] as const)("preserves PieFed errors from %s", async (_name, call) => {
    const requests: Request[] = [];
    const fetchFunction = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(new Request(input, init));
        return Response.json(
          { message: "operation_denied" },
          { status: 400, statusText: "Bad Request" },
        );
      },
    ) as BaseClientOptions["fetchFunction"];
    const client = new UnsafePiefedClient(BASE_URL, {
      fetchFunction,
      headers: {},
    });

    const error = await call(client).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({
      code: "operation_denied",
      software: "piefed",
      status: 400,
    });
    expect(requests).toHaveLength(1);
  });
});

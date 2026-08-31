import { describe, expect, it } from "vitest";

import type { components } from "../src/providers/piefed/schema";
import type { Wire } from "../src/testing/wire";

import { UnexpectedResponseError, UnsupportedError } from "../src/errors";
import { FakePiefedInstance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

const HOST = "notifications.piefed.test";

type Schemas = components["schemas"];

function notificationItem(
  over: Partial<Wire<Schemas["UserNotificationItemView"]>> &
    Pick<
      Wire<Schemas["UserNotificationItemView"]>,
      "author" | "notif_id" | "notif_subtype" | "notif_type"
    >,
): Wire<Schemas["UserNotificationItemView"]> {
  return {
    notif_body: "notification body",
    status: "Unread",
    ...over,
  };
}

function notificationsResponse(
  items: Wire<Schemas["UserNotificationItemView"]>[],
  nextPage: null | string = null,
): Wire<Schemas["UserNotificationsResponse"]> {
  return {
    counts: {
      read: 0,
      total: items.length,
      unread: items.length,
    },
    items,
    next_page: nextPage,
    status: "Unread",
    username: "recipient",
  };
}

function setup() {
  const instance = new FakePiefedInstance({ host: HOST });
  const author = instance.build.person({ id: 20, user_name: "author" });
  const recipient = instance.build.person({
    id: 21,
    user_name: "recipient",
  });
  const post = instance.build.postView({
    creator: author,
    id: 30,
    title: "A followed post",
  });
  const comment = instance.build.commentView({
    body: "A followed comment",
    creator: author,
    id: 40,
    post,
  });
  const client = new ThreadiverseClient(
    instance.origin,
    instance.clientOptions(),
  );
  instance.mock("GET /api/alpha/user/me", {
    json: instance.build.myUserInfo(recipient),
  });

  return { author, client, comment, instance, post, recipient };
}

describe("piefed getNotifications truth", () => {
  it("maps PieFed's stable subscribed post categories", async () => {
    const { author, client, instance, post } = setup();
    const items = [0, 1, 2, 5].map((notif_type) =>
      notificationItem({
        author,
        notif_id: 100 + notif_type,
        notif_subtype: `post_subscription_${notif_type}`,
        notif_type,
        post,
      }),
    );

    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse(items, "4"),
    });

    const response = await client.getNotifications({
      limit: 4,
      page_cursor: 3,
      type_: "subscribed",
      unread_only: true,
    });

    expect(response.next_page).toBe(4);
    expect(response.data).toHaveLength(4);
    expect(
      response.data.every(
        (item) =>
          item.notification.kind === "subscribed" &&
          item.data.type_ === "post" &&
          item.notification.recipient_id === 21,
      ),
    ).toBe(true);
    expect(response.data.map((item) => item.notification.published_at)).toEqual(
      items.map(() => post.post.published),
    );

    const call = instance.calls("GET /api/alpha/user/notifications")[0]!;
    expect(Object.fromEntries(call.query)).toEqual({
      limit: "4",
      page: "3",
      status: "Unread",
    });
    expect(instance.calls("GET /api/alpha/user/me")).toHaveLength(1);

    await client.getNotifications({ type_: "subscribed" });
    expect(instance.calls("GET /api/alpha/user/me")).toHaveLength(1);
  });

  it("scans past a truly empty generic page with a live cursor", async () => {
    const { author, client, instance, post } = setup();
    instance.mock("GET /api/alpha/user/notifications", (call) => {
      if (call.query.get("page") === "2")
        return {
          json: notificationsResponse([
            notificationItem({
              author,
              notif_id: 105,
              notif_subtype: "new_post_in_followed_feed",
              notif_type: 5,
              post,
            }),
          ]),
        };

      return {
        json: notificationsResponse([], "2"),
      };
    });

    const response = await client.getNotifications({ type_: "subscribed" });

    expect(response.data.map((item) => item.notification.id)).toEqual([105]);
    expect(response.next_page).toBeUndefined();
    expect(
      instance
        .calls("GET /api/alpha/user/notifications")
        .map((call) => Object.fromEntries(call.query)),
    ).toEqual([{ status: "All" }, { page: "2", status: "All" }]);
  });

  it("includes subscribed rows alongside the legacy all-inbox kinds", async () => {
    const { author, client, comment, instance, post, recipient } = setup();

    instance.mock("GET /api/alpha/user/replies", {
      json: instance.build.repliesResponse(
        [
          instance.build.commentReplyView({
            comment,
            id: 500,
            recipient,
          }),
        ],
        "2",
      ),
    });
    instance.mock("GET /api/alpha/user/mentions", {
      json: instance.build.repliesResponse([]),
    });
    instance.mock("GET /api/alpha/private_message/list", {
      json: instance.build.privateMessageListResponse([]),
    });
    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse([
        notificationItem({
          author,
          notif_id: 103,
          notif_subtype: "new_post_in_followed_community",
          notif_type: 1,
          post,
        }),
      ]),
    });

    const response = await client.getNotifications({
      limit: 1,
      type_: "all",
    });

    expect(response.data).toHaveLength(2);
    expect(response.next_page).toBe(2);
    expect(response.data.map((item) => item.notification.kind).sort()).toEqual([
      "reply",
      "subscribed",
    ]);
    expect(
      response.data.find((item) => item.notification.kind === "subscribed")!
        .notification.id,
    ).toBe(103);

    for (const route of [
      "GET /api/alpha/user/replies",
      "GET /api/alpha/private_message/list",
    ] as const) {
      expect(Object.fromEntries(instance.calls(route)[0]!.query)).toEqual({
        limit: "1",
        unread_only: "false",
      });
    }
    expect(instance.calls("GET /api/alpha/user/mentions")).toHaveLength(0);
  });

  it("keeps a cursor when PieFed may have clamped the private-message limit", async () => {
    const { client, instance, recipient } = setup();
    const creator = instance.build.person({ id: 22, user_name: "sender" });

    instance.mock("GET /api/alpha/user/replies", {
      json: instance.build.repliesResponse([]),
    });
    instance.mock("GET /api/alpha/user/mentions", {
      json: instance.build.repliesResponse([]),
    });
    instance.mock("GET /api/alpha/private_message/list", {
      json: instance.build.privateMessageListResponse([
        instance.build.privateMessageView({
          content: "one full page",
          creator,
          id: 600,
          recipient,
        }),
      ]),
    });
    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse([]),
    });

    const response = await client.getNotifications({ limit: 50 });

    expect(response.data.map((item) => item.notification.kind)).toEqual([
      "private_message",
    ]);
    expect(response.next_page).toBe(2);
  });

  it("advances every all-inbox source together without duplicate generic rows", async () => {
    const { author, client, comment, instance, post, recipient } = setup();

    instance.mock("GET /api/alpha/user/replies", (call) => ({
      json:
        call.query.get("page") === "2"
          ? instance.build.repliesResponse([
              instance.build.commentReplyView({
                comment,
                id: 500,
                recipient,
              }),
            ])
          : instance.build.repliesResponse([]),
    }));
    instance.mock("GET /api/alpha/private_message/list", {
      json: instance.build.privateMessageListResponse([]),
    });
    instance.mock("GET /api/alpha/user/notifications", (call) => {
      switch (call.query.get("page")) {
        case "2":
          return {
            json: notificationsResponse(
              [
                notificationItem({
                  author,
                  notif_id: 105,
                  notif_subtype: "new_post_in_followed_feed",
                  notif_type: 5,
                  post,
                }),
              ],
              "3",
            ),
          };
        case "3":
          return { json: notificationsResponse([]) };
        default:
          return { json: notificationsResponse([], "2") };
      }
    });

    const first = await client.getNotifications({ type_: "all" });
    const second = await client.getNotifications({
      page_cursor: first.next_page,
      type_: "all",
    });

    expect(first.data.map((item) => item.notification.id).sort()).toEqual([
      105, 500,
    ]);
    expect(first.next_page).toBe(3);
    expect(second).toEqual({ data: [], next_page: undefined });
    expect(
      instance
        .calls("GET /api/alpha/user/notifications")
        .map((call) => call.query.get("page")),
    ).toEqual([null, "2", "3"]);
  });

  it("preserves PieFed's explicit reply cursor", async () => {
    const { client, comment, instance, recipient } = setup();
    instance.mock("GET /api/alpha/user/replies", {
      json: instance.build.repliesResponse(
        [
          instance.build.commentReplyView({
            comment,
            id: 700,
            recipient,
          }),
        ],
        "7",
      ),
    });

    const response = await client.getNotifications({ type_: "reply" });

    expect(response.next_page).toBe(7);
  });

  it("maps both generic mention subtypes with stable notification ids", async () => {
    const { author, client, comment, instance, post } = setup();
    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse(
        [
          notificationItem({
            author,
            notif_id: 801,
            notif_subtype: "post_mention",
            notif_type: 6,
            post,
          }),
          notificationItem({
            author,
            comment: comment.comment,
            comment_id: comment.comment.id,
            notif_id: 802,
            notif_subtype: "comment_mention",
            notif_type: 6,
          }),
        ],
        "7",
      ),
    });
    instance.mock("GET /api/alpha/comment", {
      json: { comment_view: comment },
    });

    const response = await client.getNotifications({ type_: "mention" });

    expect(response.next_page).toBe(7);
    expect(response.data.map((item) => item.notification.id)).toEqual([
      801, 802,
    ]);
    expect(response.data.map((item) => item.data.type_)).toEqual([
      "post",
      "comment",
    ]);
    expect(instance.calls("GET /api/alpha/user/mentions")).toHaveLength(0);
    expect(
      Object.fromEntries(instance.calls("GET /api/alpha/comment")[0]!.query),
    ).toEqual({ id: "40" });
  });

  it("rejects a cyclic generic cursor", async () => {
    const { client, instance } = setup();
    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse([], "1"),
    });

    await expect(
      client.getNotifications({ type_: "subscribed" }),
    ).rejects.toThrow(UnexpectedResponseError);
  });

  it("rejects mod-action filtering instead of returning a false empty page", async () => {
    const { client, instance } = setup();

    await expect(
      client.getNotifications({ type_: "mod_action" }),
    ).rejects.toThrow(
      new UnsupportedError(
        "Listing moderation notifications is not supported by piefed",
      ),
    );
    expect(instance.calls("GET /api/alpha/user/notifications")).toHaveLength(0);
  });

  it("rejects malformed subscribed rows instead of silently dropping them", async () => {
    const { author, client, instance } = setup();
    instance.mock("GET /api/alpha/user/notifications", {
      json: notificationsResponse([
        notificationItem({
          author,
          notif_id: 100,
          notif_subtype: "new_post_from_followed_user",
          notif_type: 0,
        }),
      ]),
    });

    await expect(
      client.getNotifications({ type_: "subscribed" }),
    ).rejects.toBeInstanceOf(UnexpectedResponseError);
  });
});

import { describe, expect, it } from "vitest";

import type { ThreadiverseMode } from "../src/BaseClient";
import type { EndpointName } from "../src/capabilities";

import {
  getProviderCapabilities,
  providerCapabilities,
  providerSupports,
} from "../src/capabilities";
import { endpoints } from "../src/endpoints";

const modes = [
  "lemmyv0",
  "lemmyv1",
  "piefed",
] as const satisfies readonly ThreadiverseMode[];

const unsupportedEndpoints = {
  lemmyv0: [
    "deleteImage",
    "editCommunityNotifications",
    "editPostNotifications",
    "getRandomCommunity",
  ],
  lemmyv1: ["getFederatedInstances"],
  piefed: [
    "banFromCommunity",
    "editCommunityNotifications",
    "editPostNotifications",
    "getCaptcha",
    "getNotifications",
    "getRandomCommunity",
    "listPersonLiked",
    "markNotificationAsRead",
    "register",
  ],
} as const satisfies Record<ThreadiverseMode, readonly EndpointName[]>;

describe("provider capabilities", () => {
  it.each(modes)("classifies every canonical endpoint for %s", (mode) => {
    expect(Object.keys(getProviderCapabilities(mode)).sort()).toEqual(
      Object.keys(endpoints).sort(),
    );
  });

  it.each(modes)("matches the exact unsupported surface for %s", (mode) => {
    const unsupported = Object.entries(getProviderCapabilities(mode))
      .filter(([, supported]) => !supported)
      .map(([endpoint]) => endpoint);

    expect(unsupported).toEqual(unsupportedEndpoints[mode]);
  });

  it("exposes immutable shared maps", () => {
    expect(Object.isFrozen(providerCapabilities)).toBe(true);

    for (const mode of modes) {
      expect(Object.isFrozen(providerCapabilities[mode])).toBe(true);
      expect(getProviderCapabilities(mode)).toBe(providerCapabilities[mode]);
    }
  });

  it("describes Voyager-relevant Lemmy differences", () => {
    expect(providerSupports("lemmyv0", "getFederatedInstances")).toBe(true);
    expect(providerSupports("lemmyv0", "getRandomCommunity")).toBe(false);
    expect(providerSupports("lemmyv1", "getFederatedInstances")).toBe(false);
    expect(providerSupports("lemmyv1", "getRandomCommunity")).toBe(true);
  });

  it("describes Voyager-relevant PieFed gaps", () => {
    const capabilities = getProviderCapabilities("piefed");

    expect(capabilities.banFromCommunity).toBe(false);
    expect(capabilities.createPrivateMessageReport).toBe(true);
    expect(capabilities.deleteImage).toBe(true);
    expect(capabilities.distinguishComment).toBe(true);
    expect(capabilities.editCommunityNotifications).toBe(false);
    expect(capabilities.editPostNotifications).toBe(false);
    expect(capabilities.getCaptcha).toBe(false);
    expect(capabilities.getModlog).toBe(true);
    expect(capabilities.getNotifications).toBe(false);
    expect(capabilities.getSiteMetadata).toBe(true);
    expect(capabilities.listCommentReports).toBe(true);
    expect(capabilities.listPersonLiked).toBe(false);
    expect(capabilities.listPostReports).toBe(true);
    expect(capabilities.listReports).toBe(true);
    expect(capabilities.markNotificationAsRead).toBe(false);
    expect(capabilities.register).toBe(false);
    expect(capabilities.resolveCommentReport).toBe(true);
    expect(capabilities.resolvePostReport).toBe(true);
    expect(capabilities.saveUserSettings).toBe(true);
  });

  it("exposes PieFed's parameter-level community-ban support", () => {
    expect(
      providerSupports("piefed", "banFromCommunity", {
        remove_or_restore_data: true,
      }),
    ).toBe(false);
    expect(
      providerSupports("piefed", "banFromCommunity", {
        remove_or_restore_data: false,
      }),
    ).toBe(true);
    expect(providerSupports("piefed", "banFromCommunity", {})).toBe(true);
  });

  it("exposes PieFed's parameter-level notification-list support", () => {
    for (const type_ of [
      undefined,
      "all",
      "mention",
      "private_message",
      "reply",
      "subscribed",
    ] as const) {
      expect(providerSupports("piefed", "getNotifications", { type_ })).toBe(
        true,
      );
    }

    expect(
      providerSupports("piefed", "getNotifications", {
        type_: "mod_action",
      }),
    ).toBe(false);
  });

  it("exposes only PieFed's exact community notification modes", () => {
    for (const mode of ["all_posts", "replies_and_mentions"] as const) {
      expect(
        providerSupports("piefed", "editCommunityNotifications", { mode }),
      ).toBe(true);
    }

    for (const mode of ["all_posts_and_comments", "mute"] as const) {
      expect(
        providerSupports("piefed", "editCommunityNotifications", { mode }),
      ).toBe(false);
    }
  });

  it("models provider-specific image deletion credentials", () => {
    const tokenlessImage = {
      delete_token: "",
      url: "https://example.com/upload.png",
    };

    expect(providerSupports("lemmyv0", "deleteImage", tokenlessImage)).toBe(
      false,
    );
    expect(providerSupports("lemmyv1", "deleteImage", tokenlessImage)).toBe(
      true,
    );
    expect(providerSupports("piefed", "deleteImage", tokenlessImage)).toBe(
      true,
    );

    for (const mode of modes) {
      expect(
        providerSupports(mode, "deleteImage", {
          ...tokenlessImage,
          delete_token: "pictrs-delete-token",
        }),
      ).toBe(true);
    }
  });

  it("exposes only PieFed's exact post notification modes", () => {
    for (const mode of ["all_comments", "replies_and_mentions"] as const) {
      expect(
        providerSupports("piefed", "editPostNotifications", { mode }),
      ).toBe(true);
    }

    expect(
      providerSupports("piefed", "editPostNotifications", { mode: "mute" }),
    ).toBe(false);
  });

  it("preserves coarse notification support for non-PieFed providers", () => {
    expect(
      providerSupports("lemmyv0", "editCommunityNotifications", {
        mode: "all_posts",
      }),
    ).toBe(false);
    expect(
      providerSupports("lemmyv0", "editPostNotifications", {
        mode: "all_comments",
      }),
    ).toBe(false);
    expect(
      providerSupports("lemmyv1", "editCommunityNotifications", {
        mode: "all_posts_and_comments",
      }),
    ).toBe(true);
    expect(
      providerSupports("lemmyv1", "editPostNotifications", { mode: "mute" }),
    ).toBe(true);
  });

  it("exposes PieFed's parameter-level voted-feed support", () => {
    expect(
      providerSupports("piefed", "listPersonLiked", {
        like_type: "liked_only",
      }),
    ).toBe(true);
    expect(
      providerSupports("piefed", "listPersonLiked", {
        like_type: "disliked_only",
      }),
    ).toBe(false);

    for (const mode of ["lemmyv0", "lemmyv1"] as const) {
      expect(
        providerSupports(mode, "listPersonLiked", {
          like_type: "liked_only",
        }),
      ).toBe(true);
      expect(
        providerSupports(mode, "listPersonLiked", {
          like_type: "disliked_only",
        }),
      ).toBe(true);
    }
  });

  it("exposes PieFed's parameter-level notification support", () => {
    for (const kind of [
      "mention",
      "private_message",
      "reply",
      "subscribed",
    ] as const) {
      expect(
        providerSupports("piefed", "markNotificationAsRead", { kind }),
      ).toBe(true);
    }

    expect(
      providerSupports("piefed", "markNotificationAsRead", {
        kind: "mod_action",
      }),
    ).toBe(false);
  });

  it("accepts full canonical payloads for fine-grained checks", () => {
    expect(
      providerSupports("piefed", "banFromCommunity", {
        ban: true,
        community_id: 1,
        person_id: 2,
        remove_or_restore_data: false,
      }),
    ).toBe(true);
    expect(
      providerSupports("piefed", "markNotificationAsRead", {
        kind: "reply",
        notification_id: 3,
        read: true,
      }),
    ).toBe(true);
    expect(
      providerSupports("piefed", "editCommunityNotifications", {
        community_id: 4,
        mode: "all_posts",
      }),
    ).toBe(true);
    expect(
      providerSupports("piefed", "editPostNotifications", {
        mode: "all_comments",
        post_id: 5,
      }),
    ).toBe(true);
  });
});

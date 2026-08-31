import { providerSupports } from "../src/capabilities";
import ThreadiverseClient from "../src/ThreadiverseClient";

declare const client: ThreadiverseClient;

providerSupports("piefed", "banFromCommunity", {
  remove_or_restore_data: true,
});
providerSupports("lemmyv0", "deleteImage", { delete_token: "" });
providerSupports("piefed", "editCommunityNotifications", {
  mode: "all_posts",
});
providerSupports("piefed", "editPostNotifications", { mode: "all_comments" });
providerSupports("piefed", "getNotifications", { type_: "subscribed" });
providerSupports("piefed", "listPersonLiked", { like_type: "liked_only" });
providerSupports("piefed", "markNotificationAsRead", { kind: "reply" });

void client.supports("banFromCommunity", { remove_or_restore_data: false });
void client.supports("deleteImage", { delete_token: "" });
void client.supports("editCommunityNotifications", { mode: "mute" });
void client.supports("editPostNotifications", { mode: "replies_and_mentions" });
void client.supports("getNotifications", { type_: "mod_action" });
void client.supports("listPersonLiked", { like_type: "disliked_only" });
void client.supports("markNotificationAsRead", { kind: "mod_action" });

// Full canonical payloads are also accepted, so a consumer can preflight the
// exact action it is about to submit.
void client.supports("banFromCommunity", {
  ban: true,
  community_id: 1,
  person_id: 2,
  remove_or_restore_data: false,
});
void client.supports("deleteImage", {
  delete_token: "",
  url: "https://example.com/upload.png",
});
void client.supports("editCommunityNotifications", {
  community_id: 4,
  mode: "all_posts",
});
void client.supports("editPostNotifications", {
  mode: "all_comments",
  post_id: 5,
});
void client.supports("markNotificationAsRead", {
  kind: "private_message",
  notification_id: 3,
  read: true,
});

// @ts-expect-error Capability parameters belong to listPersonLiked.
providerSupports("piefed", "banFromCommunity", { like_type: "liked_only" });

// @ts-expect-error Capability parameters belong to markNotificationAsRead.
void client.supports("listPersonLiked", { kind: "reply" });

// @ts-expect-error Capability parameters belong to deleteImage.
void client.supports("deleteImage", { like_type: "liked_only" });

// @ts-expect-error getPosts has no parameter-level capability contract.
void client.supports("getPosts", {});

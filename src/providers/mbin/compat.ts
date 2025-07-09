import type * as types from "../../types";

import { components } from "./schema";

export function buildCommunityApId(
  url: string,
  community: components["schemas"]["MagazineSmallResponseDto"],
) {
  if (community.apProfileId) return community.apProfileId;
  return `${url}/m/${community.name}`;
}

export function buildEntryApId(
  url: string,
  entry: components["schemas"]["EntryResponseDto"],
) {
  if (entry.apId) return entry.apId;

  return `${url}/m/${entry.magazine!.name}/t/${entry.entryId}/${entry.slug}`;
}

export function buildPersonApId(
  url: string,
  person: components["schemas"]["UserSmallResponseDto"],
) {
  if (person.apProfileId) return person.apProfileId;
  return `${url}/u/${person.username}`;
}

export function toPostView(
  url: string,
  entry: components["schemas"]["EntryResponseDto"],
): types.PostView {
  return {
    banned_from_community: false,
    community: {
      actor_id: buildCommunityApId(url, entry.magazine!),
      banner: undefined,
      deleted: false,
      hidden: false,
      icon: entry.magazine!.icon?.sourceUrl || undefined,
      id: entry.magazine?.magazineId || 0,
      local: false,
      name: entry.magazine!.name!,
      nsfw: false,
      posting_restricted_to_mods: false,
      published: entry.createdAt!,
      removed: false,
      title: entry.magazine!.name!,
      updated: entry.editedAt || undefined,
      visibility: "Public",
    },
    counts: {
      comments: entry.numComments,
      downvotes: entry.dv!,
      newest_comment_time: entry.lastActive!,
      published: entry.createdAt!,
      score: entry.uv! + entry.favourites! - entry.dv!,
      upvotes: entry.uv!,
    },
    creator: {
      actor_id: buildPersonApId(url, entry.user!),
      avatar: entry.user?.avatar?.sourceUrl || undefined,
      bot_account: entry.user?.isBot || false,
      deleted: false,
      display_name: entry.user!.username!,
      id: entry.user?.userId || 0,
      local: !entry.user?.apProfileId,
      name: entry.user!.username!,
      published: entry.user!.createdAt!,
    },
    creator_banned_from_community: false,
    creator_blocked: false,
    creator_is_admin: entry.user?.isAdmin || false,
    creator_is_moderator: entry.canAuthUserModerate || false,
    hidden: false,
    my_vote: entry.userVote || undefined,
    post: {
      ap_id: buildEntryApId(url, entry),
      body: entry.body || undefined,
      community_id: entry.magazine?.magazineId || 0,
      creator_id: entry.user?.userId || 0,
      deleted: false,
      embed_description: undefined,
      embed_title: undefined,
      featured_community: entry.isPinned || false,
      featured_local: false,
      id: entry.entryId,
      language_id: 1,
      local: false,
      locked: false,
      name: entry.title!,
      nsfw: entry.isAdult!,
      published: entry.createdAt!,
      removed: false,
      thumbnail_url: entry.image?.sourceUrl || undefined,
      updated: entry.editedAt || undefined,
      url: entry.url || entry.image?.storageUrl || undefined,
    },
    read: false,
    saved: entry.isFavourited || false,
    subscribed: entry.magazine?.isUserSubscribed
      ? "Subscribed"
      : "NotSubscribed",
    unread_comments: 0,
  };
}

import { Notification } from "../../types/Notification";
import { components } from "./schema";

export function compatPiefedPerson(person: components["schemas"]["Person"]) {
  return {
    ...person,
    name: person.user_name!,
    display_name: person.title,
    bot_account: person.bot,
  };
}

export function compatPiefedPersonView(
  personView: components["schemas"]["PersonView"],
) {
  return {
    ...personView,
    person: compatPiefedPerson(personView.person),
  };
}

export function compatPiefedPost(post: components["schemas"]["Post"]) {
  return {
    ...post,
    name: post.title,
    featured_community: post.sticky,
    featured_local: false,
  };
}

export function compatPiefedPostView(post: components["schemas"]["PostView"]) {
  return {
    ...post,
    community: compatPiefedCommunity(post.community),
    post: compatPiefedPost(post.post),
    creator: compatPiefedPerson(post.creator),
  };
}

export function compatPiefedCommentView(
  comment: components["schemas"]["CommentView"],
) {
  return {
    ...comment,
    community: compatPiefedCommunity(comment.community),
    creator: compatPiefedPerson(comment.creator),
    comment: compatPiefedComment(comment.comment),
    post: compatPiefedPost(comment.post),
  };
}

export function compatPiefedCommunity(
  community: components["schemas"]["Community"],
) {
  return {
    ...community,
    posting_restricted_to_mods: community.restricted_to_mods,
    visibility: "Public" as const,
  };
}

export function compatPiefedComment(comment: components["schemas"]["Comment"]) {
  return comment;
}

export function compatPiefedCommunityView(
  community: components["schemas"]["CommunityView"],
) {
  return {
    ...community,
    community: compatPiefedCommunity(community.community),
    counts: {
      subscribers: community.counts.subscriptions_count,
      posts: community.counts.post_count,
      comments: community.counts.post_reply_count,
    },
  };
}

export function compatPiefedGetCommunityResponse(
  response: components["schemas"]["GetCommunityResponse"],
) {
  return {
    community_view: compatPiefedCommunityView(response.community_view),
    moderators: response.moderators.map(compatPiefedCommunityModeratorView),
  };
}

export function compatPiefedCommunityModeratorView(
  view: components["schemas"]["CommunityModeratorView"],
) {
  return {
    ...view,
    community: compatPiefedCommunity(view.community),
    moderator: compatPiefedPerson(view.moderator),
  };
}

export function compatPiefedNotification(
  view:
    | components["schemas"]["NotificationsItemUserView"]
    | components["schemas"]["NotificationsItemCommunityView"]
    | components["schemas"]["NotificationsItemTopicView"]
    | components["schemas"]["NotificationsItemPostView"]
    | components["schemas"]["NotificationsItemReplyView"]
    | components["schemas"]["NotificationsItemFeedView"]
    | components["schemas"]["NotificationsItemPostMentionView"]
    | components["schemas"]["NotificationsItemCommentMentionView"],
): Notification | undefined {
  switch (view.notif_type) {
    // case 0:
    //   // NotificationsItemUserView - new post from followed user
    //   return {
    //     ...view,
    //     creator: view.creator ? compatPiefedPerson(view.creator) : undefined,
    //     post: (view as components["schemas"]["NotificationsItemUserView"]).post
    //       ? compatPiefedPostView(
    //           (view as components["schemas"]["NotificationsItemUserView"])
    //             .post!,
    //         )
    //       : undefined,
    //   };

    // case 1: {
    //   // NotificationsItemCommunityView - new post in followed community
    //   const communityView =
    //     view as components["schemas"]["NotificationsItemCommunityView"];
    //   return {
    //     ...view,
    //     author: view.author ? compatPiefedPerson(view.author) : undefined,
    //     post: communityView.post
    //       ? compatPiefedPostView(communityView.post)
    //       : undefined,
    //     community: communityView.community
    //       ? compatPiefedCommunityView(communityView.community)
    //       : undefined,
    //   };
    // }

    // case 2:
    //   // NotificationsItemTopicView - new post in followed topic
    //   return {
    //     ...view,
    //     author: view.author ? compatPiefedPerson(view.author) : undefined,
    //     post: (view as components["schemas"]["NotificationsItemTopicView"]).post
    //       ? compatPiefedPostView(
    //           (view as components["schemas"]["NotificationsItemTopicView"])
    //             .post!,
    //         )
    //       : undefined,
    //   };

    case 3: {
      // NotificationsItemPostView - top level comment on followed post
      const postView =
        view as components["schemas"]["NotificationsItemPostView"];
      if (
        !postView.post ||
        !postView.comment ||
        !view.author ||
        !view.notif_id
      ) {
        return undefined;
      }

      // This maps to a PersonMentionView since it's a comment notification
      return {
        person_mention: {
          id: view.notif_id,
          recipient_id: 0, // TODO don't expose this in threadiverse
          comment_id: postView.comment.id,
          read: false,
          published: postView.comment.published,
        },
        comment: compatPiefedComment(postView.comment),
        creator: compatPiefedPerson(view.author),
        post: compatPiefedPost(postView.post.post),
        community: compatPiefedCommunity(postView.post.community),
        counts: {
          comment_id: postView.comment.id,
          score: 0,
          upvotes: 0,
          downvotes: 0,
          published: postView.comment.published,
          child_count: 0,
        },
        creator_banned_from_community: false,
        banned_from_community: false,
        creator_is_moderator: false,
        creator_is_admin: false,
        subscribed: "NotSubscribed" as const,
        saved: false,
        creator_blocked: false,
      };
    }

    case 4: {
      // NotificationsItemReplyView - new reply on followed comment
      const notif = view as components["schemas"]["NotificationsItemReplyView"];
      if (!notif.post || !notif.comment || !view.author || !view.notif_id) {
        return undefined;
      }

      // This maps to a CommentReplyView
      return {
        comment_reply: {
          id: view.notif_id,
          recipient_id: 0, // TODO don't expose this in threadiverse
          comment_id: notif.comment.id,
          read: false,
          published: notif.comment.published,
        },
        comment: compatPiefedComment(notif.comment),
        creator: compatPiefedPerson(view.author),
        post: compatPiefedPost(notif.post.post),
        community: compatPiefedCommunity(notif.post.community),
        counts: {
          comment_id: notif.comment.id,
          score: 0,
          upvotes: 0,
          downvotes: 0,
          published: notif.comment.published,
          child_count: 0,
        },
        creator_banned_from_community: notif.post.creator_banned_from_community,
        banned_from_community: notif.post.banned_from_community,
        creator_is_moderator: notif.post.creator_is_moderator,
        creator_is_admin: notif.post.creator_is_admin,
        subscribed: notif.post.subscribed,
        saved: false, // Whether the comment is saved is not exposed
        creator_blocked: notif.post.creator_blocked,
      };
    }

    // case 5:
    //   // NotificationsItemFeedView - new post in followed feed
    //   return {
    //     ...view,
    //     author: view.author ? compatPiefedPerson(view.author) : undefined,
    //     post: (view as components["schemas"]["NotificationsItemFeedView"]).post
    //       ? compatPiefedPostView(
    //           (view as components["schemas"]["NotificationsItemFeedView"])
    //             .post!,
    //         )
    //       : undefined,
    //   };

    case 6:
      // NotificationsItemPostMentionView or NotificationsItemCommentMentionView
      // Check notif_subtype to distinguish between post_mention and comment_mention
      if (view.notif_subtype === "comment_mention") {
        // NotificationsItemCommentMentionView
        const commentMentionView =
          view as components["schemas"]["NotificationsItemCommentMentionView"];
        if (!commentMentionView.comment || !view.author) {
          return undefined;
        }

        // This maps to a PersonMentionView
        return {
          person_mention: {
            id: 0, // PieFed doesn't have person_mention concept
            recipient_id: 0,
            comment_id: commentMentionView.comment_id || 0,
            read: false,
            published: commentMentionView.comment.published,
          },
          comment: compatPiefedComment(commentMentionView.comment),
          creator: compatPiefedPerson(view.author),
          post: {
            id: 0,
            name: "",
            creator_id: 0,
            community_id: 0,
            removed: false,
            locked: false,
            published: commentMentionView.comment.published,
            deleted: false,
            nsfw: false,
            ap_id: "",
            local: false,
            language_id: 0,
            featured_community: false,
            featured_local: false,
          },
          community: {
            id: 0,
            name: "",
            title: "",
            description: "",
            removed: false,
            published: commentMentionView.comment.published,
            deleted: false,
            nsfw: false,
            actor_id: "",
            local: false,
            icon: "",
            banner: "",
            hidden: false,
            posting_restricted_to_mods: false,
            visibility: "Public" as const,
          },
          recipient: compatPiefedPerson(view.author),
          counts: {
            comment_id: commentMentionView.comment_id || 0,
            score: 0,
            upvotes: 0,
            downvotes: 0,
            published: commentMentionView.comment.published,
            child_count: 0,
          },
          creator_banned_from_community: false,
          banned_from_community: false,
          creator_is_moderator: false,
          creator_is_admin: false,
          subscribed: "NotSubscribed" as const,
          saved: false,
          creator_blocked: false,
        };
      } else {
        // NotificationsItemPostMentionView
        const postMentionView =
          view as components["schemas"]["NotificationsItemPostMentionView"];
        if (!postMentionView.post || !view.author) {
          return undefined;
        }

        // This maps to a PersonMentionView for post mentions
        return {
          person_mention: {
            id: 0, // PieFed doesn't have person_mention concept
            recipient_id: 0,
            comment_id: 0,
            read: false,
            published: postMentionView.post.post.published,
          },
          comment: {
            id: 0,
            creator_id: 0,
            post_id: 0,
            content: "",
            removed: false,
            published: postMentionView.post.post.published,
            deleted: false,
            ap_id: "",
            local: false,
            path: "",
            distinguished: false,
            language_id: 0,
          },
          creator: compatPiefedPerson(view.author),
          post: compatPiefedPost(postMentionView.post.post),
          community: compatPiefedCommunity(postMentionView.post.community),
          recipient: compatPiefedPerson(view.author),
          counts: {
            comment_id: 0,
            score: 0,
            upvotes: 0,
            downvotes: 0,
            published: postMentionView.post.post.published,
            child_count: 0,
          },
          creator_banned_from_community: false,
          banned_from_community: false,
          creator_is_moderator: false,
          creator_is_admin: false,
          subscribed: "NotSubscribed" as const,
          saved: false,
          creator_blocked: false,
        };
      }

    default:
      // Unknown notification type, return undefined
      return undefined;
  }
}

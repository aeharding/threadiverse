/**
 * Provider-agnostic search over the seed store. Each fake renders these
 * results into its own software's search wire shape, so one seeded scenario
 * produces equivalent search results on every provider.
 */

import type {
  SeedComment,
  SeedCommunity,
  SeedPerson,
  SeedPost,
  SeedStore,
} from "./seed";

export interface SeedSearchResults {
  comments: SeedComment[];
  communities: SeedCommunity[];
  people: SeedPerson[];
  posts: SeedPost[];
}

/** Canonical `SearchType` values (see src/types/SearchType.ts) */
export type SeedSearchType =
  | "all"
  | "comments"
  | "communities"
  | "posts"
  | "users";

/**
 * Case-insensitive substring match over the fields a user would expect to
 * search (post title/body, comment content, community name/title, person
 * name). An absent term matches everything — browse-style search UIs rely
 * on that.
 */
export function searchSeed(
  seed: SeedStore,
  { term, type = "all" }: { term?: string; type?: SeedSearchType },
): SeedSearchResults {
  const matches = (...fields: (string | undefined)[]) =>
    !term ||
    fields.some((field) => field?.toLowerCase().includes(term.toLowerCase()));

  const wanted = (bucket: Exclude<SeedSearchType, "all">) =>
    type === "all" || type === bucket;

  return {
    comments: wanted("comments")
      ? seed.comments.filter((comment) => matches(comment.content))
      : [],
    communities: wanted("communities")
      ? seed.communities.filter((community) =>
          matches(community.name, community.title),
        )
      : [],
    people: wanted("users")
      ? seed.people.filter((person) => matches(person.name, person.displayName))
      : [],
    posts: wanted("posts")
      ? seed.posts.filter((post) => matches(post.name, post.body))
      : [],
  };
}

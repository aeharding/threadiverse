import type { GetPersonDetails as LemmyV0GetPersonDetails } from "lemmy-js-client-v0";

import type { paths } from "../src/providers/piefed/schema";
import type { ListPersonContent } from "../src/types";
import type { ListPersonContentByMode } from "../src/types/ListPersonContent";

export type LemmyV0SortContract = Expect<
  Equal<
    NonNullable<ListPersonContentByMode["lemmyv0"]["sort"]>,
    NonNullable<LemmyV0GetPersonDetails["sort"]>
  >
>;
export type PiefedCommentSortContract = Expect<
  Equal<
    NonNullable<PiefedCommentPayload["sort"]>,
    NonNullable<PiefedCommentListQuery["sort"]>
  >
>;
export type PiefedPostSortContract = Expect<
  Equal<
    NonNullable<PiefedPostPayload["sort"]>,
    NonNullable<PiefedPostListQuery["sort"]>
  >
>;

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

type PiefedCommentListQuery = NonNullable<
  paths["/api/alpha/comment/list"]["get"]["parameters"]["query"]
>;
type PiefedCommentPayload = Extract<
  ListPersonContentByMode["piefed"],
  { type: "comments" }
>;

type PiefedPostListQuery = NonNullable<
  paths["/api/alpha/post/list"]["get"]["parameters"]["query"]
>;
type PiefedPostPayload = Extract<
  ListPersonContentByMode["piefed"],
  { type: "posts" }
>;

function acceptsListPersonContent(_payload: ListPersonContent) {}

acceptsListPersonContent({
  mode: "lemmyv0",
  sort: "TopWeek",
  username: "alex@example.com",
});
acceptsListPersonContent({
  mode: "lemmyv1",
  type: "comments",
  username: "alex@example.com",
});
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  sort: "TopWeek",
  type: "posts",
});
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  sort: "Controversial",
  type: "comments",
});
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  sort: "TopAll",
  type: "all",
});
acceptsListPersonContent({ person_id: 1, type: "all" });

// @ts-expect-error Lemmy v1's person-content endpoint has no sort parameter.
acceptsListPersonContent({ mode: "lemmyv1", person_id: 1, sort: "new" });

acceptsListPersonContent({
  mode: "lemmyv1",
  person_id: 1,
  // @ts-expect-error `type_` is Lemmy's wire field; the public API uses `type`.
  type_: "comments",
});

// @ts-expect-error PieFed's list routes identify people by numeric ID.
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  username: "alex@example.com",
});

// @ts-expect-error TopWeek is a PieFed post sort, not a comment sort.
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  sort: "TopWeek",
  type: "comments",
});

// @ts-expect-error Combined content only accepts sorts shared by both routes.
acceptsListPersonContent({
  mode: "piefed",
  person_id: 1,
  sort: "TopWeek",
  type: "all",
});

// @ts-expect-error Provider-specific fields require a mode discriminator.
acceptsListPersonContent({ person_id: 1, sort: "New" });

// @ts-expect-error Username lookup is not portable to PieFed.
acceptsListPersonContent({ username: "alex@example.com" });

// @ts-expect-error A person identifier is required.
acceptsListPersonContent({ type: "all" });

// @ts-expect-error PieFed specifically requires a numeric person ID.
acceptsListPersonContent({ mode: "piefed", type: "posts" });

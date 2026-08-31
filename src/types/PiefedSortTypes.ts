/**
 * PieFed sort literals used by the canonical public request types.
 *
 * Keep these structural instead of referencing the generated OpenAPI
 * `paths` interface: a reference from an exported type retains that entire
 * interface in the rolled-up declaration bundle. Exact equality with the
 * corresponding wire query types is enforced by a compile-time contract
 * test.
 */
export type PiefedCommentSort =
  | "Controversial"
  | "Hot"
  | "New"
  | "Old"
  | "Top"
  | "TopAll";

export type PiefedCommunitySort =
  | "Active"
  | "Hot"
  | "New"
  | "NewFederated"
  | "Old"
  | "OldFederated"
  | "Top"
  | "TopAll"
  | "TopPosts"
  | "TopSubscribers";

export type PiefedPostSort =
  | "Active"
  | "Hot"
  | "New"
  | "Old"
  | "Scaled"
  | "Top"
  | "TopAll"
  | "TopDay"
  | "TopHour"
  | "TopMonth"
  | "TopNineMonths"
  | "TopSixHour"
  | "TopSixMonths"
  | "TopThreeMonths"
  | "TopTwelveHour"
  | "TopWeek"
  | "TopYear";

export type PiefedSearchSort =
  | "Active"
  | "Hot"
  | "New"
  | "NewFederated"
  | "Old"
  | "OldFederated"
  | "Relevance"
  | "Scaled"
  | "Top"
  | "TopAll"
  | "TopDay"
  | "TopHour"
  | "TopMonth"
  | "TopNineMonths"
  | "TopPosts"
  | "TopSixHour"
  | "TopSixMonths"
  | "TopSubscribers"
  | "TopThreeMonths"
  | "TopTwelveHour"
  | "TopWeek"
  | "TopYear";

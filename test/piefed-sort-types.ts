import type { paths } from "../src/providers/piefed/schema";
import type {
  CommentSortTypeByMode,
  CommunitySortTypeByMode,
  PostSortTypeByMode,
  SearchSortTypeByMode,
} from "../src/types";

export type PiefedCommentSortContract = Expect<
  Equal<
    CommentSortTypeByMode["piefed"]["sort"],
    QuerySort<"/api/alpha/comment/list">
  >
>;

export type PiefedCommunitySortContract = Expect<
  Equal<
    CommunitySortTypeByMode["piefed"]["sort"],
    QuerySort<"/api/alpha/community/list">
  >
>;

export type PiefedPostSortContract = Expect<
  Equal<PostSortTypeByMode["piefed"]["sort"], QuerySort<"/api/alpha/post/list">>
>;

export type PiefedSearchSortContract = Expect<
  Equal<SearchSortTypeByMode["piefed"]["sort"], QuerySort<"/api/alpha/search">>
>;

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

type QuerySort<
  Path extends
    | "/api/alpha/comment/list"
    | "/api/alpha/community/list"
    | "/api/alpha/post/list"
    | "/api/alpha/search",
> = NonNullable<NonNullable<paths[Path]["get"]["parameters"]["query"]>["sort"]>;

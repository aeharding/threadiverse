import * as schemas from ".";
import { buildPagableResponse } from "./PagableResponse";

export const ListPostsResponse = buildPagableResponse(schemas.PostView);
export const ListCommentsResponse = buildPagableResponse(schemas.CommentView);
export const ListModlogResponse = buildPagableResponse(schemas.ModlogItem);
export const ListNotificationsResponse = buildPagableResponse(
  schemas.Notification,
);
export const ListPersonMentionsResponse = buildPagableResponse(
  schemas.PersonMentionView,
);
export const ListPrivateMessagesResponse = buildPagableResponse(
  schemas.PrivateMessageView,
);
export const ListRepliesResponse = buildPagableResponse(
  schemas.CommentReplyView,
);
export const ListCommentReportsResponse = buildPagableResponse(
  schemas.CommentReportView,
);
export const ListCommunitiesResponse = buildPagableResponse(
  schemas.CommunityView,
);
export const ListPersonContentResponse = buildPagableResponse(
  schemas.PersonContentItem,
);
export const ListPostReportsResponse = buildPagableResponse(
  schemas.PostReportView,
);
export const ListReportsResponse = buildPagableResponse(schemas.ReportItemView);
export const ListSearchResponse = buildPagableResponse(schemas.SearchItem);

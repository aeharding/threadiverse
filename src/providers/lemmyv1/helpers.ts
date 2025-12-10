import { ReportCombinedView as LemmyReportCombinedView } from "lemmy-js-client-v1";

import { LemmyV1PostCommentReportOnly } from "./compat";

export function isPostCommentReport(
  report: LemmyReportCombinedView
): report is LemmyV1PostCommentReportOnly {
  return report.type_ === "post" || report.type_ === "comment";
}

// export function toCommentSortType(
//   sort: LemmyV0CommentSortType
// ): CommentSortType {
//   switch (sort) {
//     case "Controversial":
//       return "controversial";
//     case "Hot":
//       return "hot";
//     case "New":
//       return "new";
//     case "Old":
//       return "old";
//     case "Top":
//       return "top";
//   }
// }

// export function toFeatureType(
//   feature_type: LemmyV0FeatureType
// ): PostFeatureType {
//   switch (feature_type) {
//     case "Community":
//       return "community";
//     case "Local":
//       return "local";
//   }
// }

// export function toListingType(listing_type: LemmyV0ListingType): ListingType {
//   switch (listing_type) {
//     case "All":
//       return "all";
//     case "Local":
//       return "local";
//     case "ModeratorView":
//       return "moderator_view";
//     case "Subscribed":
//       return "subscribed";
//   }
// }

import { ReportCombinedView as LemmyReportCombinedView } from "lemmy-js-client-v1";
import { LemmyV1PostCommentReportOnly } from "./compat";

export function isPostCommentReport(
  report: LemmyReportCombinedView,
): report is LemmyV1PostCommentReportOnly {
  return report.type_ === "Post" || report.type_ === "Comment";
}

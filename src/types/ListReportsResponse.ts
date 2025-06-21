import { CommentReportView } from "./CommentReportView";
import { PostReportView } from "./PostReportView";

/**
 * The post reports response.
 */
export type ListReportsResponse = {
  reports: (CommentReportView | PostReportView)[];
};

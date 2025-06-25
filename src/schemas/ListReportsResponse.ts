import { z } from "zod/v4-mini";

import { CommentReportView } from "./CommentReportView";
import { PostReportView } from "./PostReportView";

/**
 * The post reports response.
 */
export const ListReportsResponse = z.object({
  reports: z.array(z.union([CommentReportView, PostReportView])),
});

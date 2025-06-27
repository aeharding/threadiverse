import { z } from "zod/v4-mini";

import { CommentReportView } from "./CommentReportView";
import { buildPagableResponse } from "./PagableResponse";
import { PostReportView } from "./PostReportView";

/**
 * The post reports response.
 */
export const ListReportsResponse = buildPagableResponse(
  z.union([CommentReportView, PostReportView]),
);

import { z } from "zod/v4-mini";

import { CommentReportView } from "./CommentReportView";
import { PostReportView } from "./PostReportView";

export const ReportItemView = z.union([CommentReportView, PostReportView]);

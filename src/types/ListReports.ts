import { PageParams } from "./PageParams";

/**
 * List comment reports.
 */
export type ListReports = PageParams & {
  /**
   * if no community is given, it returns reports for all communities moderated by the auth user
   */
  community_id?: number;
  /**
   * Only shows the unresolved reports
   */
  unresolved_only?: boolean;
};

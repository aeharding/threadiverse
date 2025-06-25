/**
 * List comment reports.
 */
export type ListReports = {
  /**
   * if no community is given, it returns reports for all communities moderated by the auth user
   */
  community_id?: number;
  limit?: number;
  page?: number;
  /**
   * Only shows the unresolved reports
   */
  unresolved_only?: boolean;
};

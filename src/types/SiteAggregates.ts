/**
 * Aggregate data for a site.
 */
export type SiteAggregates = {
  users: number;
  posts: number;
  comments: number;
  communities: number;
  /**
   * The number of users with any activity in the last day.
   */
  users_active_day: number;
  /**
   * The number of users with any activity in the last week.
   */
  users_active_week: number;
  /**
   * The number of users with any activity in the last month.
   */
  users_active_month: number;
  /**
   * The number of users with any activity in the last half year.
   */
  users_active_half_year: number;
};

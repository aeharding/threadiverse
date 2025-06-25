import { z } from "zod/v4-mini";

/**
 * Aggregate data for a site.
 */
export const SiteAggregates = z.object({
  comments: z.number(),
  communities: z.number(),
  posts: z.number(),
  users: z.number(),
  /**
   * The number of users with any activity in the last day.
   */
  users_active_day: z.number(),
  /**
   * The number of users with any activity in the last half year.
   */
  users_active_half_year: z.number(),
  /**
   * The number of users with any activity in the last month.
   */
  users_active_month: z.number(),
  /**
   * The number of users with any activity in the last week.
   */
  users_active_week: z.number(),
});

import { z } from "zod/v4-mini";

const BaseCommunityAggregates = z.object({
  comments: z.number(),
  posts: z.number(),
  subscribers: z.number(),
});

const ExtendedCommunityAggregates = z.object({
  comments: z.number(),
  posts: z.number(),
  subscribers: z.number(),

  subscribers_local: z.number(),
  /**
   * The number of users with any activity in the last day.
   */
  users_active_day: z.number(),
  /**
   * The number of users with any activity in the last year.
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

export const CommunityAggregates = z.union([
  BaseCommunityAggregates,
  ExtendedCommunityAggregates,
]);

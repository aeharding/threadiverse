export type CommunityAggregates =
  | BaseCommunityAggregates
  | (BaseCommunityAggregates & LemmyCommunityAggregates);

type BaseCommunityAggregates = {
  subscribers: number;
  posts: number;
  comments: number;
};

type LemmyCommunityAggregates = {
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
   * The number of users with any activity in the last year.
   */
  users_active_half_year: number;
  subscribers_local: number;
};

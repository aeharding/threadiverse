/**
 * Ban a user from a community.
 */
export type BanFromCommunity = {
  community_id: number;
  person_id: number;
  ban: boolean;
  /**
   * Optionally remove or restore all their data. Useful for new troll accounts.
   * If ban is true, then this means remove. If ban is false, it means restore.
   */
  remove_or_restore_data?: boolean;
  reason?: string;
  /**
   * A time that the ban will expire, in unix epoch seconds.
   *
   * An i64 unix timestamp is used for a simpler API client implementation.
   */
  expires?: number;
};

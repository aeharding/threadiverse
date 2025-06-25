/**
 * Ban a user from a community.
 */
export type BanFromCommunity = {
  ban: boolean;
  community_id: number;
  /**
   * A time that the ban will expire, in unix epoch seconds.
   *
   * An i64 unix timestamp is used for a simpler API client implementation.
   */
  expires?: number;
  person_id: number;
  reason?: string;
  /**
   * Optionally remove or restore all their data. Useful for new troll accounts.
   * If ban is true, then this means remove. If ban is false, it means restore.
   */
  remove_or_restore_data?: boolean;
};

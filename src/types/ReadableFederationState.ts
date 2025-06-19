export interface ReadableFederationState {
  /**
   * timestamp of the next retry attempt (null if fail count is 0)
   */
  next_retry?: string;
  instance_id: number;
  /**
   * the last successfully sent activity id
   */
  last_successful_id?: number;
  last_successful_published_time?: string;
  /**
   * how many failed attempts have been made to send the next activity
   */
  fail_count: number;
  /**
   * timestamp of the last retry attempt (when the last failing activity was resent)
   */
  last_retry?: string;
}

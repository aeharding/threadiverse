/**
 * A response for your login.
 */
export type LoginResponse = {
  /**
   * This is None in response to `Register` if email verification is enabled, or the server
   * requires registration applications.
   */
  jwt?: string;
  /**
   * If registration applications are required, this will return true for a signup response.
   */
  registration_created: boolean;
  /**
   * If email verifications are required, this will return true for a signup response.
   */
  verify_email_sent: boolean;
};

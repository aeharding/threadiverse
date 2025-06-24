import { z } from "zod/v4-mini";

/**
 * A response for your login.
 */
export const LoginResponse = z.object({
  /**
   * This is None in response to `Register` if email verification is enabled, or the server
   * requires registration applications.
   */
  jwt: z.optional(z.string()),
  /**
   * If registration applications are required, this will return true for a signup response.
   */
  registration_created: z.boolean(),
  /**
   * If email verifications are required, this will return true for a signup response.
   */
  verify_email_sent: z.boolean(),
});

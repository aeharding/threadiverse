import * as z from "zod/v4-mini";

/**
 * The registration mode for your site. Determines what happens after a user signs up.
 */
export const RegistrationMode = z.enum([
  "closed",
  "require_application",
  "require_invitation",
  "open",
]);

import { z } from "zod/v4-mini";

/**
 * The registration mode for your site. Determines what happens after a user signs up.
 */
export const RegistrationMode = z.enum([
  "Closed",
  "RequireApplication",
  "Open",
]);

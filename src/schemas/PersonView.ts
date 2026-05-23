import { z } from "zod/v4-mini";

import { Person } from "./Person";

export const PersonView = z.object({
  is_admin: z.boolean(),
  person: Person,
});

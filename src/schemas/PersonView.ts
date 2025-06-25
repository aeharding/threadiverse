import { z } from "zod/v4-mini";

import { Person } from "./Person";

export const PersonAggregates = z.object({
  comment_count: z.number(),
  post_count: z.number(),
});

export const PersonView = z.object({
  counts: PersonAggregates,
  is_admin: z.boolean(),
  person: Person,
});

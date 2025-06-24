import { z } from "zod/v4-mini";
import { Person } from "./Person";

export const PersonAggregates = z.object({
  post_count: z.number(),
  comment_count: z.number(),
});

export const PersonView = z.object({
  person: Person,
  counts: PersonAggregates,
  is_admin: z.boolean(),
});

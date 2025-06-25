import { z } from "zod/v4-mini";

export const Vote = z.number().check(z.gte(-1), z.lte(1));

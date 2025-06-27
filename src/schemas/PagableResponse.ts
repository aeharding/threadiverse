import { z } from "zod/v4-mini";

export const PageCursor = z.union([z.string(), z.number()]);

export const PagableResponse = z.object({
  next_page: z.optional(PageCursor),
  prev_page: z.optional(PageCursor),
});

export function buildPagableResponse<
  S extends z.ZodMiniObject | z.ZodMiniUnion,
>(schema: S) {
  return z.extend(PagableResponse, {
    data: z.array(schema),
  });
}

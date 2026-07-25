/**
 * Pagination for derived fake responses.
 *
 * The two supported softwares page differently — Lemmy v1 hands out opaque
 * cursor strings, PieFed uses 1-based page numbers — so the fakes derive
 * pages the same way their real counterparts do, and consumers exercise
 * their real pagination code paths.
 */

/** Prefix marks fake cursors as opaque: nothing should parse them */
const CURSOR_PREFIX = "seed-offset:";

export interface Page<T> {
  items: T[];
  /** Wire `next_page` value; absent when the last page was served */
  nextPage?: string;
}

/**
 * Depth of a comment from its materialized path (`0.24.27` → 2); top-level
 * comments are depth 1.
 */
export function depthOf(path: string): number {
  return path.split(".").length - 1;
}

/**
 * Lemmy v1 style: opaque `page_cursor` strings the server round-trips.
 */
export function paginateByCursor<T>(
  items: T[],
  { cursor, limit }: { cursor?: string; limit?: number },
): Page<T> {
  const offset = cursor?.startsWith(CURSOR_PREFIX)
    ? Number(cursor.slice(CURSOR_PREFIX.length))
    : 0;
  const end = limit === undefined ? items.length : offset + limit;

  return {
    items: items.slice(offset, end),
    nextPage: end < items.length ? `${CURSOR_PREFIX}${end}` : undefined,
  };
}

/**
 * PieFed style: 1-based `page` numbers. Without a `limit` there's only one
 * page, so later pages are empty (matching a server that has nothing more
 * to give).
 */
export function paginateByPage<T>(
  items: T[],
  { limit, page }: { limit?: number; page?: number },
): Page<T> {
  const current = page ?? 1;

  if (limit === undefined)
    return { items: current > 1 ? [] : items, nextPage: undefined };

  const start = (current - 1) * limit;
  const end = start + limit;

  return {
    items: items.slice(start, end),
    nextPage: end < items.length ? String(current + 1) : undefined,
  };
}

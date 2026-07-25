/**
 * Pagination for derived fake responses.
 *
 * The two supported softwares page differently — Lemmy v1 hands out opaque
 * cursor strings, PieFed uses 1-based page numbers — so the fakes derive
 * pages the same way their real counterparts do, and consumers exercise
 * their real pagination code paths.
 */

/**
 * Note: real servers reject a non-positive or non-numeric `limit` (Lemmy
 * 400s with `invalid_fetch_limit`) and a corrupt cursor. These helpers
 * degrade to an empty page / offset 0 instead — never to a cursor that
 * fails to advance, so a consumer's paging loop can't spin forever.
 */

export interface Page<T> {
  items: T[];
  /** Wire `next_page` value; absent when the last page was served */
  nextPage?: string;
}

/**
 * Hands out cursors a client cannot derive.
 *
 * A cursor that encodes its own offset (`offset:40`) lets a buggy consumer
 * fabricate the next one and still page correctly, so tests can't tell
 * "echoes the server's cursor" from "invents one". Tokens here are opaque
 * counter values resolved through this map — echoing what the server sent
 * is the only way to advance. Counter, not random, so runs stay
 * reproducible.
 */
export class CursorTokens {
  #next = 1;

  #offsets = new Map<string, number>();

  /** Mint a cursor pointing at `offset` */
  issue(offset: number): string {
    const token = `seed-cursor-${this.#next++}`;
    this.#offsets.set(token, offset);
    return token;
  }

  /** The offset a cursor refers to; unknown cursors start from the top */
  offsetOf(cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    return this.#offsets.get(cursor) ?? 0;
  }
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
  tokens: CursorTokens,
): Page<T> {
  const offset = tokens.offsetOf(cursor);
  const end = limit === undefined ? items.length : offset + limit;
  const page = items.slice(offset, end);

  // Real Lemmy hands out a cursor whenever it filled the page — so the last
  // full page is followed by an empty one, and consumers that stop on "no
  // cursor" are exercised properly. `limit > 0` keeps a degenerate limit
  // from emitting a cursor that never advances.
  const hasMore = limit !== undefined && limit > 0 && page.length === limit;

  return { items: page, nextPage: hasMore ? tokens.issue(end) : undefined };
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
  const current = Math.max(1, page ?? 1);

  if (limit === undefined)
    return { items: current > 1 ? [] : items, nextPage: undefined };

  const start = (current - 1) * limit;
  const end = start + limit;
  const items_ = items.slice(start, end);

  return {
    items: items_,
    nextPage:
      limit > 0 && items_.length === limit ? String(current + 1) : undefined,
  };
}

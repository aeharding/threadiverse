export type PageParams = {
  limit?: number;
  page_cursor?: PageCursor;
};

type PageCursor = number | string;

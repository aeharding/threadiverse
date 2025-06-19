/**
 * A federated instance / site.
 */
export type Instance = {
  id: number;
  domain: string;
  published: string;
  updated?: string;
  software?: string;
  version?: string;
};

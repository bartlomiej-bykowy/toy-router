export type Route = {
  path: string;
  view: string | (() => Promise<any>);
  beforeEnter?: (ctx: RouteContext) => boolean | Promise<boolean>;
};

export type RouteContext = {
  url: URL;
  pathname: string;
  parmas: Record<string, string>;
  query: Record<string, string>;
  hash: string;
};

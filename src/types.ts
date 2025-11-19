export type HtmlStringView = string;
export type WebComponentView = string;
export type HtmlElementView = HTMLElement;
export type LazyView = () => Promise<any>;

export type ViewTypes =
  | HtmlStringView
  | WebComponentView
  | HtmlElementView
  | LazyView;

export type Route = {
  path: string;
  view: ViewTypes;
  beforeEnter?: (ctx: RouteContext) => boolean | Promise<boolean>;
};

export type RouteContext = {
  url: URL;
  pathname: string;
  params: Record<string, string> | null;
  query: Record<string, string> | null;
  hash: string | null;
};

export type MatchResult = {
  route: Route;
  params: Record<string, string>;
};

export type OnRouteChangeCallback = (ctx: RouteContext) => void;

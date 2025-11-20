export type HtmlStringView = string;
export type WebComponentView = `${Lowercase<string>}-${string}`;
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
  preserveScrollPosition?: boolean;
  title?: string;
};

export type RouteContext = {
  url: URL;
  pathname: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
};

export type MatchResult = {
  route: Route;
  params: Record<string, string>;
};

export type OnRouteChangeCallback = (ctx: RouteContext) => void | Promise<void>;

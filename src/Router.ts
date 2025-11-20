import type {
  MatchResult,
  OnRouteChangeCallback,
  Route,
  RouteContext,
  ViewTypes,
} from "./types";

export class Router {
  routes: Route[];
  root: string;
  rootElement: HTMLElement;

  static #routerInstances = 0;
  static #currentRouteContext: RouteContext;
  static #currentRoute: MatchResult;
  static #routeChangeCallbacks: OnRouteChangeCallback[] = [];
  static #scrollPositions: Map<string, number> = new Map();

  constructor(routes: Route[], root: string) {
    this.#singletonGuard();

    this.routes = this.#loadRoutes(routes);
    this.root = root;
    this.rootElement = this.#setRootElement();

    this.#bindEvents();
    this.#renderRoute();
  }

  // ------------- PUBLIC METHODS ------------- //

  navigate(path: string): void {
    const normalizedPath = this.#normalizeUrl(path);

    this.#renderRoute(normalizedPath, () =>
      history.pushState({}, "", normalizedPath)
    );
  }

  redirect(path: string): void {
    const normalizedPath = this.#normalizeUrl(path);

    this.#renderRoute(normalizedPath, () =>
      history.replaceState({}, "", normalizedPath)
    );
  }

  url(): URL {
    return Router.#currentRouteContext.url;
  }

  params() {
    const { params, query, hash } = Router.#currentRouteContext;

    return {
      params,
      query,
      hash,
    };
  }

  currentRoute(): MatchResult {
    return Router.#currentRoute;
  }

  onRouteChange(cb: OnRouteChangeCallback): () => void {
    if (typeof cb !== "function") {
      throw new Error("onRouteChange callback must be a function.");
    }

    Router.#routeChangeCallbacks.push(cb);

    return () => {
      Router.#routeChangeCallbacks = Router.#routeChangeCallbacks.filter(
        (callback) => callback !== cb
      );
    };
  }

  // ------------- PRIVATE METHODS ------------- //

  #singletonGuard(): void {
    if (Router.#routerInstances > 0) {
      // There is already instace of Router
      throw new Error("Router already initialized.");
    } else {
      Router.#routerInstances++;
    }
  }

  #loadRoutes(routes: Route[]): Route[] {
    const isCatchAllRoute = routes.find((route) => route.path === "*");
    if (isCatchAllRoute) return routes;

    const catchAllRoute: Route = {
      path: "*",
      view: "<h1>404 Page Not Foud</h1>",
    };

    return [...routes, catchAllRoute];
  }

  #setRootElement(): HTMLElement {
    const el = document.querySelector(this.root) as HTMLElement;

    if (!el) {
      throw new Error(`Element ${this.root} not found.`);
    }

    return el;
  }

  #bindEvents(): void {
    window.addEventListener("popstate", () => this.#renderRoute());
    document.addEventListener("click", (e: PointerEvent) =>
      this.#handleLinkClick(e)
    );
  }

  #handleLinkClick(event: PointerEvent): void {
    // ignore if click with modifier
    const { defaultPrevented, metaKey, ctrlKey, shiftKey, altKey, button } =
      event;
    if (defaultPrevented) return;
    if (metaKey || ctrlKey || shiftKey || altKey) return;
    // not left button
    if (button !== 0) return;

    // we need to get full click path because of web components
    const clickPath = event.composedPath() as HTMLElement[];
    const anchor = clickPath.find((el) => el instanceof HTMLAnchorElement);

    if (!anchor) return;

    let href = anchor.getAttribute("href");
    const targetBlank = anchor.getAttribute("target") === "_blank";
    const isDownload = anchor.hasAttribute("download");
    const isExternal = anchor.getAttribute("rel") === "external";

    if (!href || targetBlank || isDownload || isExternal) return;
    // is anchor link
    if (href.startsWith("#")) {
      event.preventDefault();
      this.#scrollToElement(href);
      return;
    }

    const forbiddenProtocols = [
      "http://",
      "https://",
      "mailto:",
      "tel:",
      "sms:",
      "ftp:",
      "javascript:",
      "blob:",
      "file:",
      "data:",
    ];

    const loweredHref = href.toLowerCase();
    const hasForbiddenProtocol = forbiddenProtocols.some((protocol) =>
      loweredHref.startsWith(protocol)
    );

    if (hasForbiddenProtocol) return;

    href = this.#normalizeUrl(href);

    // prevent default if all criteria are met
    event.preventDefault();
    this.navigate(href);
  }

  #matchRoute(pathname: string): MatchResult {
    const regexp = /^\/|\/$/g;
    const pathArr = pathname.replace(regexp, "").split("/");

    let matchRoute: MatchResult = {
      route: this.routes.find((route) => route.path === "*")!,
      params: {},
    };

    for (const route of this.routes) {
      const routeArr = route.path.replace(regexp, "").split("/");

      if (routeArr.length === pathArr.length) {
        let params: MatchResult["params"] = {};
        let routeFound = true;

        for (const idx in routeArr) {
          const routeSegment = routeArr[idx];
          const pathSegment = pathArr[idx];

          if (routeSegment.startsWith(":")) {
            params[routeSegment.slice(1)] = pathSegment;
          } else if (routeSegment !== pathSegment) {
            routeFound = false;
            break;
          }
        }

        if (routeFound) {
          matchRoute.route = route;
          matchRoute.params = params;
          break;
        }
      }
    }

    return matchRoute;
  }

  async #renderRoute(path?: string, historyAction?: () => void): Promise<any> {
    const pathname = path
      ? new URL(path, window.location.origin).pathname
      : window.location.pathname;
    const matchedRoute = this.#matchRoute(pathname);
    const newRouteContext = this.#createRouteContext(matchedRoute);

    const canEnterRoute =
      (await matchedRoute.route.beforeEnter?.(newRouteContext)) ?? true;

    if (!canEnterRoute) return;

    Router.#currentRoute = matchedRoute;
    Router.#currentRouteContext = newRouteContext;

    const { pathname: pn, search, hash } = Router.#currentRouteContext.url;
    const scrollPositionsMapKey = pn + search + hash;
    // preserve scroll position on the page user is leaving
    if (Router.#currentRoute.route.preserveScrollPosition) {
      Router.#scrollPositions.set(scrollPositionsMapKey, window.screenY);
    }

    historyAction?.();

    await this.#renderRouteView(Router.#currentRoute.route);
    this.#callRouteChangeCallbacks();

    // scroll the view
    const lastScrollPosition = Router.#scrollPositions.get(
      scrollPositionsMapKey
    );

    if (Router.#currentRouteContext.hash) {
      this.#scrollToElement(Router.#currentRouteContext.hash);
    } else if (lastScrollPosition) {
      window.scrollTo(0, lastScrollPosition);
    } else {
      window.scrollTo(0, 0);
    }
  }

  #createRouteContext(matchedRoute: MatchResult): RouteContext {
    const url = new URL(window.location.href);
    const { pathname, search, hash } = url;
    const query = search.replace("?", "");
    // turn ?id=1&sort=asc into {id: 1, sort: "asc"}
    const queryObj = query.length
      ? query.split("&").reduce<Record<string, string>>((obj, val) => {
          const [rawKey, rawValue = ""] = val.split("=");
          const key = decodeURIComponent(rawKey);
          const value = decodeURIComponent(rawValue);
          obj[key] = value;
          return obj;
        }, {})
      : {};

    const routeContext: RouteContext = {
      url,
      pathname,
      params: matchedRoute.params,
      query: queryObj,
      hash: hash.replace("#", ""),
    };

    return routeContext;
  }

  async #renderRouteView(route: Route): Promise<void> {
    const { view } = route;

    if (!view) {
      throw new Error(`View for the route ${route.path} is missing.`);
    }

    const { viewType, view: viewElement } = await this.#validateView(view);

    if (viewType === "string") {
      this.rootElement.replaceChildren();
      this.rootElement.innerHTML = viewElement as string;
    }
    if (viewType === "web-component") {
      const element = document.createElement(viewElement as string);
      this.rootElement.replaceChildren(element);
    }
    if (viewType === "html-element") {
      this.rootElement.replaceChildren(viewElement as HTMLElement);
    }
    // set page's title if provided
    if (route.title) document.title = route.title;
  }

  async #validateView(view: ViewTypes): Promise<{
    viewType: "string" | "web-component" | "html-element";
    view: ViewTypes;
  }> {
    if (typeof view === "string") {
      const trimmed = view.trim();
      // string
      if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        return {
          viewType: "string",
          view: trimmed,
        };
      }
      // web component
      const regexp = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
      if (regexp.test(trimmed)) {
        return {
          viewType: "web-component",
          view: trimmed,
        };
      }
    }
    // html element
    if (view instanceof HTMLElement) {
      return {
        viewType: "html-element",
        view,
      };
    }
    // lazy loaded element
    if (typeof view === "function") {
      const viewPromise = view();
      if (viewPromise instanceof Promise) {
        const resolvedViewPromise = await viewPromise;
        if (resolvedViewPromise.default) {
          return this.#validateView(resolvedViewPromise.default);
        }
        return this.#validateView(resolvedViewPromise);
      }
    }
    // other type
    throw new Error(
      "Unrecognized view format. View should be a string, name of a web component, html element or promise resolving to one of these types."
    );
  }

  #normalizeUrl(url: string): string {
    return url.startsWith("/") ? url : "/" + url;
  }

  #callRouteChangeCallbacks(): void {
    Router.#routeChangeCallbacks.forEach((callback) => {
      try {
        callback(Router.#currentRouteContext);
      } catch (error) {
        console.error("RouteChange callback error: ", error);
      }
    });
  }

  #scrollToElement(hash: string): void {
    const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
    const element = document.getElementById(hashValue);
    element?.scrollIntoView({ behavior: "smooth" });
  }
}

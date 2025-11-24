import type {
  MatchResult,
  OnRouteChangeCallback,
  Route,
  RouteContext,
  ViewTypes,
} from "./types";
import {
  loadRoutes,
  matchRoute,
  normalizeUrl,
  scrollToElement,
} from "./utils/";

export class Router {
  routes: Route[];
  root: string;
  rootElement: HTMLElement;

  static #routerInstances = 0;
  static #currentRouteContext: RouteContext;
  static #currentRoute: MatchResult;
  static #routeChangeCallbacks: OnRouteChangeCallback[] = [];
  static #scrollPositions: Map<string, number> = new Map();
  static #isDevMode: boolean;

  static #clickCallback: any;
  static #popstateCallback: any;

  constructor(routes: Route[], root: string, devMode?: boolean) {
    this.#setDevFlag(devMode);
    this.#singletonGuard();

    this.routes = loadRoutes(routes);
    this.root = root;
    this.rootElement = this.#setRootElement();

    this.#bindEvents();
    this.#renderRoute();
  }

  // ------------- PUBLIC METHODS ------------- //

  navigate(path: string): void {
    const normalizedPath = normalizeUrl(path);

    this.#renderRoute(normalizedPath, () =>
      history.pushState({}, "", normalizedPath)
    );
  }

  redirect(path: string): void {
    const normalizedPath = normalizeUrl(path);

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
      this.#renderError(
        new Error("onRouteChange callback must be a function.")
      );
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
      this.#renderError(new Error("Router already initialized."));
    } else {
      Router.#routerInstances++;
    }
  }

  #setRootElement(): HTMLElement {
    const el = document.querySelector(this.root) as HTMLElement;

    if (!el) {
      this.#renderError(new Error(`Element ${this.root} not found.`));
    }

    return el;
  }

  #bindEvents(): void {
    Router.#popstateCallback = () => this.#renderRoute();
    Router.#clickCallback = (e: PointerEvent) => this.#handleLinkClick(e);

    window.addEventListener("popstate", Router.#popstateCallback);
    document.addEventListener("click", Router.#clickCallback);
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
      scrollToElement(href);
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

    href = normalizeUrl(href);

    // prevent default if all criteria are met
    event.preventDefault();
    this.navigate(href);
  }

  async #renderRoute(path?: string, historyAction?: () => void): Promise<any> {
    const pathname = path
      ? new URL(path, window.location.origin).pathname
      : window.location.pathname;
    const matchedRoute = matchRoute(pathname, this.routes);
    const newRouteContext = this.#createRouteContext(
      matchedRoute,
      path || pathname
    );

    let canEnterRoute: boolean;

    try {
      canEnterRoute =
        (await matchedRoute.route.beforeEnter?.(newRouteContext)) ?? true;
    } catch (error) {
      if (error instanceof Error) {
        error.message = "beforeEnter error: " + error.message;
        this.#renderError(error);
      }
      return;
    }

    if (!canEnterRoute) return;

    Router.#currentRoute = matchedRoute;
    Router.#currentRouteContext = newRouteContext;

    const { pathname: pn, search, hash } = Router.#currentRouteContext.url;
    const scrollPositionsMapKey = pn + search + hash;
    // preserve scroll position on the page user is leaving
    if (Router.#currentRoute.route.preserveScrollPosition) {
      Router.#scrollPositions.set(scrollPositionsMapKey, window.scrollY);
    }

    historyAction?.();

    try {
      await this.#renderRouteView(Router.#currentRoute.route);
    } catch (error) {
      if (error instanceof Error) {
        error.message = "Route view render error: " + error.message;
        this.#renderError(error);
      }
    }

    this.#callRouteChangeCallbacks();

    // scroll the view
    const lastScrollPosition = Router.#scrollPositions.get(
      scrollPositionsMapKey
    );

    if (Router.#currentRouteContext.hash) {
      scrollToElement(Router.#currentRouteContext.hash);
    } else if (lastScrollPosition !== undefined) {
      window.scrollTo(0, lastScrollPosition);
    } else {
      window.scrollTo(0, 0);
    }
  }

  #createRouteContext(matchedRoute: MatchResult, path: string): RouteContext {
    const url = new URL(path, window.location.origin);
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
      this.#renderError(
        new Error(`View for the route ${route.path} is missing.`)
      );
    }

    let viewType: "string" | "web-component" | "html-element";
    let viewElement: ViewTypes;

    try {
      const validatedView = await this.#validateView(view);
      viewType = validatedView.viewType;
      viewElement = validatedView.view;
    } catch (error) {
      if (error instanceof Error) {
        error.message = "Route view render error: " + error.message;
        this.#renderError(error);
      }
      return;
    }

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
        let resolvedViewPromise: any;

        try {
          resolvedViewPromise = await viewPromise;
        } catch (error) {
          if (error instanceof Error) {
            error.message =
              "There was a problem with lazy loading view. " + error.message;
            this.#renderError(error);
          }
        }

        if (resolvedViewPromise.default) {
          return this.#validateView(resolvedViewPromise.default);
        }
        return this.#validateView(resolvedViewPromise);
      }
    }
    // other type
    this.#renderError(
      new Error(
        "Unrecognized view format. View should be a string, name of a web component, html element or promise resolving to one of these types."
      )
    );
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

  #setDevFlag(userSetting?: boolean): void {
    const bundlerSetting =
      import.meta.env.DEV || import.meta.env.MODE === "development";

    Router.#isDevMode = userSetting ?? bundlerSetting ?? false;
  }

  #renderError(error: Error): never {
    if (Router.#isDevMode) {
      const div = document.createElement("div");
      div.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.95); display: flex; align-items: center; justify-content: center;">
        <div style="margin: auto auto; border: 2px solid red; color: white; max-width: 80%;">
          <div style="padding: 10px 15px; border-bottom: 1px solid red;">
            <span style="font-size: 18px">Router Error</span>
          </div>
          <div style="padding: 10px 15px">
            <pre>${error.message}</pre>
          </div>
        </div>
      </div>
    `;
      document.body.appendChild(div);
    } else {
      console.error("[Router error]", error);
    }

    throw error;
  }

  static __resetForTests() {
    if (Router.#popstateCallback) {
      window.removeEventListener("popstate", Router.#popstateCallback);
      Router.#popstateCallback = undefined;
    }

    if (Router.#clickCallback) {
      document.removeEventListener("click", Router.#clickCallback);
      Router.#clickCallback = undefined;
    }

    Router.#routerInstances = 0;
    Router.#currentRouteContext = undefined as any;
    Router.#currentRoute = undefined as any;
    Router.#routeChangeCallbacks = [];
    Router.#scrollPositions = new Map();
    Router.#isDevMode = undefined as any;
  }
}

import type { MatchResult, Route } from "./types";

export class Router {
  routes: Route[];
  root: string;
  rootEl: HTMLElement;

  static #routerInstances = 0;

  constructor(routes: Route[], root: string) {
    this.#singletonGuard();

    this.routes = this.#loadRoutes(routes);
    this.root = root;
    this.rootEl = this.#setRootElement();

    this.#bindEvents();
    this.#renderView();
  }

  // ------------- PUBLIC METHODS ------------- //

  navigate(path: string): void {
    // TODO: will navigate to specified path and render nee view
  }

  url(): URL {
    // TODO: acts as wrapper for new URL and returns current path info
  }

  params(): void {
    // TODO: returns object with path params: path, query, hash
  }

  redirect(): void {
    // TODO: redirect - similar to navigate but don't alter state of history
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
    window.addEventListener("popstate", this.#renderView);
    document.addEventListener("click", (e) => this.#handleLinkClick(e));
  }

  #handleLinkClick(e: PointerEvent): void {
    // TODO: here we'll handle link click
  }

  #renderView(): void {
    // TODO: render view for current route, use matchRoute
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
}

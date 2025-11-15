import type { Route } from "./types";

export class Router {
  routes: Route[];
  root: string;
  rootEl: HTMLElement;

  static #routerInstances = 0;

  constructor(routes: Route[], root: string) {
    this.#singletonGuard();

    this.routes = routes;
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

  #matchRoute(pathname: string): Route | null {
    // TODO: match route against current path, use it in renderView
    return null;
  }
}

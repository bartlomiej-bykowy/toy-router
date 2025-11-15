import type { Route } from "./types";

export class Router {
  routes: Route[];
  root: string;
  rootEl: HTMLElement;

  static #numOfInstances = 0;

  constructor(routes: Route[], root: string) {
    this.#singletonGuard();

    this.routes = routes;
    this.root = root;
    this.rootEl = this.#setRootEl();

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
    // TODO: implement guard
  }

  #setRootEl(): HTMLElement {
    // TODO: set the root element
  }

  #bindEvents(): void {
    // TODO: add popstate listiner and click listeners for links
  }

  #renderView(): void {
    // TODO: render view for current route, use matchRoute
  }

  #matchRoute(pathname: string): Route | null {
    // TODO: match route against current path, use it in renderView
    return null;
  }
}

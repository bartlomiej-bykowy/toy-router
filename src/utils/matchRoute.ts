import type { MatchResult, Route } from "../types";

export function matchRoute(pathname: string, routes: Route[]): MatchResult {
  const regexp = /^\/|\/$/g;
  const pathArr = pathname.replace(regexp, "").split("/");

  let matchRoute: MatchResult = {
    route: routes.find((route) => route.path === "*")!,
    params: {},
  };

  for (const route of routes) {
    const routeArr = route.path.replace(regexp, "").split("/");

    if (routeArr.length === pathArr.length) {
      let params: MatchResult["params"] = {};
      let routeFound = true;

      for (const idx in routeArr) {
        const routeSegment = routeArr[idx];
        const pathSegment = pathArr[idx];
        // check for dynamic parameter
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

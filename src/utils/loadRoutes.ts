import type { Route } from "../types";

export function loadRoutes(routes: Route[]): Route[] {
  const isCatchAllRoute = routes.find((route) => route.path === "*");
  if (isCatchAllRoute) return routes;

  const catchAllRoute: Route = {
    path: "*",
    view: "<h1>404 Page Not Foud</h1>",
  };

  return [...routes, catchAllRoute];
}

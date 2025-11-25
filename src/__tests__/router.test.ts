import { describe, it, expect, beforeEach, vi } from "vitest";
import { Router } from "../Router";
import { loadRoutes, matchRoute } from "../utils";
import type { Route } from "../types";

window.HTMLElement.prototype.scrollIntoView = vi.fn();

async function tick() {
  return Promise.resolve();
}

async function setup(
  routes: Route[]
): Promise<{ root: string; router: Router }> {
  const root = "#app";
  document.body.innerHTML = `<div id="app"></div>`;
  const router = new Router(routes, root, false);

  await tick();
  return { root, router };
}

const routes = [
  { path: "/", view: "<h1>Home</h1>" },
  { path: "/page-2", view: "<h1>Page 2</h1>" },
  { path: "/user/:id", view: "<h1>User</h1>" }
];

describe("JS Router", () => {
  beforeEach(() => {
    Router.__resetForTests();
    vi.restoreAllMocks();
    vi.resetAllMocks();
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  describe("Singleton guard", () => {
    it("throws if Router is created twice", async () => {
      const { root } = await setup(routes);

      expect(() => new Router(routes, root, false)).toThrowError(
        /Router already initialized/
      );
    });
  });

  describe("Basic routing", () => {
    it("renders the initial route on load", async () => {
      const { root } = await setup(routes);

      expect(document.querySelector(root)!.innerHTML).toContain("Home");
    });

    it("navigate() updates pathname and renders new route", async () => {
      const { root, router } = await setup(routes);

      router.navigate("/page-2");
      await tick();

      expect(window.location.pathname).toBe("/page-2");
      expect(document.querySelector(root)!.innerHTML).toContain("Page 2");
    });

    it("redirect() uses replaceState instead of pushState", async () => {
      const { router } = await setup(routes);

      const replaceSpy = vi.spyOn(history, "replaceState");

      router.redirect("/page-2");
      await tick();

      expect(replaceSpy).toHaveBeenCalled();
      expect(window.location.pathname).toBe("/page-2");
    });
  });

  describe("Match route", () => {
    it("matchRoute correctly extracts params", () => {
      const res = matchRoute("/user/123", routes);

      expect(res.params.id).toBe("123");
      expect(res.route.path).toBe("/user/:id");
    });

    it("loadRoutes auto-appends catch-all route", () => {
      const r = loadRoutes([{ path: "/", view: "<h1>Home</h1>" }]);
      expect(r[r.length - 1].path).toBe("*");
    });
  });

  describe("Before enter guard", () => {
    it("beforeEnter can block navigation", async () => {
      const guardedRoutes = [
        {
          path: "/",
          view: "<h1>Home</h1>"
        },
        {
          path: "/secret",
          view: "<h1>Secret</h1>",
          beforeEnter: () => false
        }
      ];

      const { root, router } = await setup(guardedRoutes);

      router.navigate("/secret");
      await tick();

      // stays on "/"
      expect(window.location.pathname).toBe("/");
      expect(document.querySelector(root)!.innerHTML).toContain("Home");
    });

    it("beforeEnter can be async", async () => {
      const guardedRoutes = [
        {
          path: "/",
          view: "<h1>Home</h1>"
        },
        {
          path: "/private",
          view: "<h1>Private</h1>",
          beforeEnter: async () => {
            await new Promise((r) => setTimeout(r, 10));
            return true;
          }
        }
      ];

      const { root, router } = await setup(guardedRoutes);

      router.navigate("/private");

      await vi.waitFor(() => {
        expect(window.location.pathname).toBe("/private");
        expect(document.querySelector(root)!.innerHTML).toContain("Private");
      });
    });
  });

  describe("onRouteChange callback", () => {
    it("calls onRouteChange callback", async () => {
      const { router } = await setup(routes);

      const spy = vi.fn();
      router.onRouteChange(spy);

      router.navigate("/page-2");
      await tick();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Queries and hash", () => {
    it("parses query params correctly", async () => {
      const { router } = await setup(routes);

      router.navigate("/?id=123&sort=asc#home");
      await tick();

      const { query, hash } = router.params();

      expect(query["id"]).toBe("123");
      expect(query["sort"]).toBe("asc");
      expect(hash).toBe("home");
    });
  });

  describe("Hash scroll", () => {
    it("scrolls to hash element when hash is present", async () => {
      const { router } = await setup(routes);

      const element = document.createElement("div");
      element.setAttribute("id", "target");

      document.body.appendChild(element);

      const scrollSpy = vi.spyOn(element, "scrollIntoView");

      router.navigate("/#target");
      await tick();

      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  describe("Rendering view", () => {
    it("renders string HTML view", async () => {
      await setup([{ path: "/", view: "<div class='test'>OK</div>" }]);

      expect(document.querySelector(".test")).not.toBeNull();
    });

    it("renders HTML element view", async () => {
      const el = document.createElement("div");
      el.textContent = "HTML Element";

      const { root } = await setup([{ path: "/", view: el }]);

      expect(document.querySelector(root)!.textContent).toBe("HTML Element");
    });

    it("renders web component", async () => {
      customElements.define(
        "x-test-el",
        class extends HTMLElement {
          connectedCallback() {
            this.innerHTML = "<p>WC</p>";
          }
        }
      );

      await setup([{ path: "/", view: "x-test-el" }]);

      expect(document.querySelector("x-test-el")).not.toBeNull();
    });

    it("renders lazy-loaded view", async () => {
      const routes = [
        {
          path: "/",
          view: async () => ({
            default: "<h1>Lazy</h1>"
          })
        }
      ];

      const { root } = await setup(routes);

      await vi.waitFor(() => {
        expect(document.querySelector(root)!.innerHTML).toContain("Lazy");
      });
    });
  });

  describe("Link handling", () => {
    it("intercepts internal <a> links and navigates", async () => {
      const { root } = await setup(routes);

      document.body.insertAdjacentHTML(
        "beforeend",
        '<a id="lnk" href="/page-2">go</a>'
      );

      const link = document.getElementById("lnk")!;
      link.click();

      await vi.waitFor(() => {
        expect(window.location.pathname).toBe("/page-2");
        expect(document.querySelector(root)!.innerHTML).toContain("Page 2");
      });
    });

    it("does NOT intercept external/forbidden URLs", async () => {
      const { router } = await setup(routes);

      const navSpy = vi.spyOn(router, "navigate");

      document.body.insertAdjacentHTML(
        "beforeend",
        '<a href="http://example.com">ext</a>'
      );

      const link = document.querySelector("a")!;
      link.click();

      expect(navSpy).not.toHaveBeenCalled();
    });

    it("handles hash-only internal links", async () => {
      await setup([{ path: "/", view: "<p>OK</p>" }]);

      document.body.insertAdjacentHTML(
        "beforeend",
        `<div id="section"></div>
      <a href="#section" id="goto">hash</a>`
      );

      const scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView");

      document.getElementById("goto")!.click();

      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  describe("Scroll restoration", () => {
    it("restores scroll position when returning to a route", async () => {
      // scrollX and scrollY are read-only properties, and jsdom doesn't
      // simulate real scrolling. We need to overwrite these properties so they
      // can be updated and so we can verify whether the scroll restoration
      // logic works correctly.
      ["scrollY", "scrollX"].forEach((prop) =>
        Object.defineProperty(window, prop, {
          value: 0,
          writable: true,
          configurable: true
        })
      );
      Object.defineProperty(window, "scrollTo", {
        value: (x: number, y: number) => {
          window.scrollX = x;
          window.scrollY = y;
        },
        writable: true,
        configurable: true
      });

      const routes = [
        {
          path: "/",
          view: "<h1>Home</h1>",
          preserveScrollPosition: true
        },
        { path: "/page-2", view: "<h1>Page 2</h1>" }
      ];

      const { root, router } = await setup(routes);
      await tick();
      // imitate user scrolling
      window.scrollTo(0, 500);
      // start to spy scrollTo after imitating user's scroll to prevent false pasitive results
      window.scrollTo = vi.fn();

      router.navigate("/page-2");
      await tick();

      window.history.back();
      window.dispatchEvent(new PopStateEvent("popstate"));
      await tick();

      await vi.waitFor(() => {
        expect(document.querySelector(root)!.innerHTML).toContain("Home");
        expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
      });
    });
  });
});

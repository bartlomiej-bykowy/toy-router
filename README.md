# toy-router

\*_toy-router_ is a small, dependency-free client-side router for building simple SPA-style navigation in plain JavaScript.
It was created to demonstrate how routing works under the hood and how to build a minimal framework-agnostic navigation system.
To see it in action you can use [this](https://github.com/bartlomiej-bykowy/toy-shop) simple demo app.

---

## 🚀 Features

- 🎯 Zero dependencies
- 🧭 History API navigation (`pushState`, `replaceState`)
- 🪝 Route guards (`beforeEnter`)
- 🧩 Views as:
  - strings and HTML strings (`<h1>Hello</h1>`)
  - Web Components
  - HTMLElements
  - Lazy loaded views (`() => import("./page.js")`)
- 🔍 Dynamic route params (`/users/:id`)
- 🔄 Route change events
- 📌 Scroll restoration per route
- 🔗 Hash scrolling (`/page#section`)
- ⚠️ Dev-mode error overlay
- 🚫 404 catch-all
- 🔥 Full TypeScript support

---

## 📦 Installation

Install the router from npm:

```sh
npm install @bartlomiej-bykowy/toy-router
# or
pnpm add @bartlomiej-bykowy/toy-router
# or
yarn add @bartlomiej-bykowy/toy-router
```

then install:

```bash
npm install @bartlomiej-bykowy/toy-router
# or
yarn add @bartlomiej-bykowy/toy-router
# or
pnpm add @bartlomiej-bykowy/toy-router
```

---

## 🕹️ Basic Usage

index.ts

```ts
import { Router } from "@bartlomiej-bykowy/toy-router";

const routes = [
  {
    path: "/",
    view: "<h1>Home</h1>",
  },
  {
    path: "/about",
    view: "about-page",
  },
  {
    path: "/products",
    view: () => import("./pages/ProductsPage.js"),
  },
  {
    path: "/admin",
    view: "<h1>Admin</h1>",
    beforeEnter: ({ query }) => query.token === "secret",
  },
];

const router = new Router(routes, "#app");
```

index.html

```html
<body>
  <div id="app"></div>
</body>
```

The router will:

- intercept `<a href="">` clicks,
- update the URL without reloading,
- render the matching view into `#app`.

---

# 🔭 API

`new Router(routes, rootSelector, devMode?)`

| Parameter      | Type      | Description                           |
| -------------- | --------- | ------------------------------------- |
| `routes`       | `Route[]` | Route definitions                     |
| `rootSelector` | `string`  | DOM selector where views are rendered |
| `devMode`      | `boolean` | Enables the dev error overlay         |

---

## Types

### `Route` type

```ts
type Route = {
  path: string; // "/users/:id"
  view: ViewTypes; // See ViewTypes below
  beforeEnter?: (ctx: RouteContext) => boolean | Promise<boolean>;
  preserveScrollPosition?: boolean;
  title?: string;
};
```

### `ViewTypes` type

```ts
export type HtmlStringView = string; // "<h1>Hello</h1>"
export type WebComponentView = `${Lowercase<string>}-${string}`; // "app-home"
export type HtmlElementView = HTMLElement; // new SomePage()
export type LazyView = () => Promise<any>; // dynamic import

export type ViewTypes =
  | HtmlStringView
  | WebComponentView
  | HtmlElementView
  | LazyView;
```

### `RouteContext` type

```ts
type RouteContext = {
  url: URL;
  pathname: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
};
```

---

### Methods

`navigate(path: string)`
Updates the URL and renders the route:

```ts
router.navigate("/products/42");
```

`redirect(path: string)`
Replaces the current history entry:

```ts
router.redirect("/login");
```

`onRouteChange(cb)`
Subscribes to route changes:

```ts
router.onRouteChange((ctx) => {
  console.log("Now at:", ctx.pathname);
});
```

`params()`
Returns:

```ts
{
  params: { id: "42" },
  query: { sort: "desc" },
  hash: "section3"
}
```

`currentRoute()`
Returns info about current route.

```ts
{
  route: {
    path: string; // "/users/:id"
    view: ViewTypes; // See ViewTypes below
    beforeEnter?: (ctx: RouteContext) => boolean | Promise<boolean>;
    preserveScrollPosition?: boolean;
    title?: string;
  },
  params: { id: "42" };
}
```

`url()`
Basically a wrappper over a new URL().

---

## 🛣️ Defining Routes

### Static route

```ts
{ path: "/about", view: "<h1>About</h1>" }
```

### Dynamic params

```ts
{ path: "/users/:id", view: "user-profile" }
```

### Web component

```ts
{ path: "/settings", view: "settings-page" }
```

### HTMLElement instance

```ts
{ path: "/cart", view: document.createElement("cart-page") }
```

### Lazy loaded view

```ts
{
  path: "/dashboard",
  view: () => import("./Dashboard.js")
}
```

### Route guard (beforeEnter)

```ts
{
  path: "/admin",
  view: "admin-panel",
  beforeEnter: (ctx) => isLoggedIn()
}
```

Async:

```ts
beforeEnter: async () => await checkServerPermission();
```

---

### Set the page title

```ts
{
  path: "/products",
  view: "products-page"
  title: "Products"
}
```

---

## 🔄 Route Change Events

Provided callback will be fired on every route change.

```ts
const unsubscribe = router.onRouteChange((ctx) => {
  console.log("Route changed:", ctx.pathname);
});

// later
unsubscribe();
```

---

## 🔁 Scroll Behavior

- Restores scroll if `preserveScrollPosition: true`
- Hash links scroll automatically

---

## ⚠️ Dev Mode Error Overlay

In dev mode, router renders a fullscreen overlay for:

- invalid views
- dynamic import errors
- guard errors
- missing root element
- double initialization

In production errors go to console only.

---

## 🔧 TypeScript Support

Types are included:

```ts
import type { Route, RouteContext } from "@bartlomiej-bykowy/toy-router";
```

## Dev mode

Router will try to automatically detect the enviorment set by the bundler. If you don't use the bundler, then you can set it manualy `new Router(routes,"#app",true)`.

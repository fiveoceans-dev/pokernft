if (!self.define) {
  let e,
    s = {};
  const n = (n, i) => (
    (n = new URL(n + ".js", i).href),
    s[n] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, a) => {
    const c =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[c]) return;
    let t = {};
    const r = (e) => n(e, c),
      o = { module: { uri: c }, exports: t, require: r };
    s[c] = Promise.all(i.map((e) => o[e] || r(e))).then((e) => (a(...e), t));
  };
}
define(["./workbox-4754cb34"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "36a0cdf6ae322262f23b16197d3a65ce",
        },
        {
          url: "/_next/static/XxFJg-OXMBUYQ14-j1Lfd/_buildManifest.js",
          revision: "deaf7a6bf19c921481c942e443baf65c",
        },
        {
          url: "/_next/static/XxFJg-OXMBUYQ14-j1Lfd/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/13-3386f5054ecc9220.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/144-d83e41ee9fbaa5f5.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/23-6c3203a2e7a7f40f.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/259-4d08fd6c2516db28.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/2f0b94e8-d5409678aa4d22ff.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/312-2d1ad6c47b114654.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/473f56c0-579879790f6981fb.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/532-ede25c9d674cc7a1.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/607-826855f427b09d5f.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/620.460c92bba75c2028.js",
          revision: "460c92bba75c2028",
        },
        {
          url: "/_next/static/chunks/648-5ebae018117d863a.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/695-93860c5215529c65.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/70646a03-03402d8e6763d3b8.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/743-25ef4170318c86ec.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/790-bb67bb589f747317.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/8e1d74a4-f42fa9939b8c6467.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-c8820970c4b2fd5b.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/configure/page-789aefbacbe8b2cd.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/debug/page-8cb05c3a2c15f53b.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/layout-c744cf0791a46226.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/nft/%5Bid%5D/page-0fd35490ff6ffb89.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/page-996ae466a78a934e.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/app/play/page-d845373f86e18731.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/cb355538-ec6cdf481a292eea.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/e6909d18-5230cc3ec3f60e86.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/fd9d1056-a75d287af9d68cfc.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/framework-10c5a3a36623554f.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/main-97f8d15e45fabe94.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/main-app-5886811b5e274760.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/pages/HomePage-51d22054bb7358f4.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/pages/HomeTables-6a2076116883bbb4.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/pages/_app-9e9b8993d349c2ae.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/pages/_error-1be831200e60c5c0.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/chunks/polyfills-78c92fac7aa8fdd8.js",
          revision: "79330112775102f91e1010318bae2bd3",
        },
        {
          url: "/_next/static/chunks/webpack-34e15e5ec3c05453.js",
          revision: "XxFJg-OXMBUYQ14-j1Lfd",
        },
        {
          url: "/_next/static/css/b76e2b58b2186194.css",
          revision: "b76e2b58b2186194",
        },
        {
          url: "/blast-icon-color.svg",
          revision: "f455c22475a343be9fcd764de7e7147e",
        },
        {
          url: "/debug-icon.svg",
          revision: "25aadc709736507034d14ca7aabcd29d",
        },
        {
          url: "/debug-image.png",
          revision: "34c4ca2676dd59ff24d6338faa1af371",
        },
        {
          url: "/explorer-icon.svg",
          revision: "84507da0e8989bb5b7616a3f66d31f48",
        },
        {
          url: "/gradient-s.svg",
          revision: "c003f595a6d30b1b476115f64476e2cf",
        },
        { url: "/logo.ico", revision: "3d10c9692073e77d925595322ae24c04" },
        { url: "/logo.svg", revision: "13a19d77a1c682993b7c4fa9254a143a" },
        { url: "/manifest.json", revision: "781788f3e2bc4b2b176b5d8c425d7475" },
        { url: "/nft-art.png", revision: "14f53c64738877b3fa88aab9a910979b" },
        { url: "/nft.png", revision: "d03c88ded58792ce4abda0659221ef4a" },
        { url: "/poker.png", revision: "b9449effe384bcadd1ec623a59abfbe6" },
        { url: "/poker.svg", revision: "9988ce4f9f7a583858e6331f21515d2c" },
        {
          url: "/pokerboots.svg",
          revision: "9988ce4f9f7a583858e6331f21515d2c",
        },
        {
          url: "/rpc-version.png",
          revision: "cf97fd668cfa1221bec0210824978027",
        },
        {
          url: "/scaffold-config.png",
          revision: "1ebfc244c31732dc4273fe292bd07596",
        },
        {
          url: "/sn-symbol-gradient.png",
          revision: "908b60a4f6b92155b8ea38a009fa7081",
        },
        {
          url: "/starkcompass-icon.svg",
          revision: "eccc2ece017ee9e73e512996b74e49ac",
        },
        {
          url: "/voyager-icon.svg",
          revision: "06663dd5ba2c49423225a8e3893b45fe",
        },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: n,
              state: i,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ));
});

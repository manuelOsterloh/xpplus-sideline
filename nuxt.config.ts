import { buildOfflineBundle } from "./scripts/build-sw.mjs";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-12",
  ssr: false,
  hooks: {
    "nitro:init"(nitro) {
      if (nitro.options.dev) return;
      nitro.hooks.hook("compiled", () =>
        buildOfflineBundle(nitro.options.output.publicDir),
      );
    },
  },
  devtools: { enabled: false },
  css: [
    "~/assets/css/main.css",
    "~/assets/css/product.css",
    "~/assets/css/fieldline-shell.css",
    "~/assets/css/fieldline-capture.css",
  ],
  app: {
    head: {
      title: "MIDFIELD · Football-Statistiken",
      htmlAttrs: { lang: "de" },
      meta: [
        {
          name: "description",
          content:
            "Football-Statistiken direkt an der Sideline erfassen, auswerten und offline auf dem Tablet nutzen.",
        },
        { name: "robots", content: "noindex, nofollow" },
        { name: "theme-color", content: "#193c32" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "MIDFIELD" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          sizes: "192x192",
          href: "/icon-192.png",
        },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/icon-192.png" },
      ],
    },
  },
});

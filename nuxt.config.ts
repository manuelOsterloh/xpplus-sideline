export default defineNuxtConfig({
  compatibilityDate: "2026-10-12",
  ssr: false,
  devtools: { enabled: false },
  css: ["~/assets/css/main.css", "~/assets/css/product.css"],
  app: {
    head: {
      title: "XP+ Sideline · Game day, in focus.",
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
        { name: "apple-mobile-web-app-title", content: "Sideline" },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/icon-192.png" },
      ],
    },
  },
});

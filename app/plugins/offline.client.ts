export default defineNuxtPlugin(() => {
  const offline = useOffline();
  const sync = () => {
    offline.online.value = navigator.onLine;
  };
  sync();
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  if (import.meta.dev) return;
  if (!("serviceWorker" in navigator)) {
    offline.failure.value = "Offline nicht verfügbar";
    return;
  }
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "OFFLINE_READY") {
      offline.available.value = e.data.ready === true;
      offline.phase.value = e.data.ready ? "Vollständig" : "Unvollständig";
      offline.failure.value = e.data.ready ? "" : "Offline-Paket unvollständig";
    }
  });
  const check = () =>
    navigator.serviceWorker.controller?.postMessage("CHECK_READY");
  navigator.serviceWorker.addEventListener("controllerchange", check);
  const watchWorker = (reg: ServiceWorkerRegistration) => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "redundant" && !reg.active)
        offline.failure.value = "Offline-Setup fehlgeschlagen";
      if (worker.state === "installed") offline.update.value = !!reg.waiting;
      offline.phase.value = worker.state;
      if (worker.state === "activated") check();
    });
  };
  offline.phase.value = "App-Paket anfordern";
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((reg) => {
      offline.phase.value = reg.installing
        ? "App-Paket laden"
        : reg.waiting
          ? "Update bereit"
          : reg.active
            ? "App-Paket prüfen"
            : "Initialisierung";
      offline.update.value = !!reg.waiting;
      watchWorker(reg);
      reg.addEventListener("updatefound", () => watchWorker(reg));
      navigator.serviceWorker.ready.then((active) =>
        active.active?.postMessage("CHECK_READY"),
      );
      check();
    })
    .catch(() => {
      offline.failure.value = "Offline-Setup fehlgeschlagen";
    });
});

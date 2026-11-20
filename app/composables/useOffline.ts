export function useOffline() {
  const phase = useState("offline-phase", () => "Start");
  const online = useState("network-online", () => true);
  const available = useState("offline-ready", () => false);
  const update = useState("offline-update", () => false);
  const failure = useState("offline-error", () => "");
  const busy = useState("offline-busy", () => false);
  const label = computed(
    () =>
      failure.value ||
      (!online.value
        ? available.value
          ? "Offline · bereit"
          : "Offline · ungesichert"
        : available.value
          ? "Offline bereit"
          : update.value
            ? "Update bereit"
            : import.meta.dev
              ? "Entwicklung"
              : "Offline laden…"),
  );
  async function activate() {
    busy.value = true;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => location.reload(),
          { once: true },
        );
        registration.waiting.postMessage("ACTIVATE");
        setTimeout(() => {
          busy.value = false;
        }, 8000);
      } else {
        update.value = false;
        busy.value = false;
      }
    } catch {
      failure.value = "Update fehlgeschlagen. Erneut versuchen.";
      busy.value = false;
    }
  }
  return { online, available, update, failure, label, activate, busy, phase };
}

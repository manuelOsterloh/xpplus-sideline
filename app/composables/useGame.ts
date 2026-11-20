import {
  applyPlay,
  startOvertime,
  nextPeriod,
  takeTimeout,
  blankInput,
  makeDemo,
  initialState,
  teamStats,
  type Play,
  type PlayInput,
  type State,
} from "#shared/game";
import { revisePlay, carryAdjustments } from "#shared/review";
import { defaultPlaybook, type CallEntry } from "#shared/playbook";
import {
  parseSnapshot,
  replaceStoredSnapshot,
  STORAGE_KEY,
  RECOVERY_KEY,
  type GameSnapshot,
} from "#shared/storage";
export interface Player {
  number: string;
  name: string;
  position: string;
  team: "home" | "away";
}
export function useGame() {
  const isDemo = useState("isDemo", () => true);
  const storageError = ref("");
  const recoveryData = ref<string | null>(null);
  const previousBackup = ref<string | null>(null);
  let storageBlocked = false;
  const playbook = useState<CallEntry[]>("playbook", defaultPlaybook);
  const settings = useState("settings", () => ({
    night: false,
    quarterMinutes: 15,
    playClock: 25,
  }));
  const adjustments = useState<{ before: State; after: State; at: string }[]>(
    "adjustments",
    () => [],
  );
  const revisions = useState<
    { id: string; before: Play[]; after: Play[]; reason: string; at: string }[]
  >("revisions", () => []);
  const plays = useState<Play[]>("plays", makeDemo);
  const override = useState<State | null>("override", () => null);
  const club = useState("club", () => ({
    name: "Düsseldorf Panther",
    short: "DUS",
    opponent: "Cologne Crocodiles",
    opponentShort: "CGN",
    primary: "#193c32",
    secondary: "#dbf479",
    accent: "#f4f2eb",
    logo: "",
  }));
  const roster = useState<Player[]>("roster", () => [
    { number: "12", name: "Max Weber", position: "QB", team: "home" },
    { number: "22", name: "Leon Fischer", position: "RB", team: "home" },
    { number: "81", name: "Tom Schneider", position: "WR", team: "home" },
    { number: "11", name: "Ben Wagner", position: "WR", team: "home" },
    { number: "3", name: "Jan Becker", position: "K", team: "home" },
    { number: "54", name: "Paul Hoffmann", position: "LB", team: "home" },
    { number: "7", name: "Tim Müller", position: "QB", team: "away" },
    { number: "24", name: "Jonas Klein", position: "RB", team: "away" },
    { number: "10", name: "Luca Wolf", position: "WR", team: "away" },
    { number: "18", name: "Felix Braun", position: "WR", team: "away" },
    { number: "9", name: "Finn Koch", position: "K", team: "away" },
    { number: "44", name: "Noah Hartmann", position: "LB", team: "away" },
  ]);
  const state = computed(
    () => override.value ?? plays.value.at(-1)?.after ?? initialState(),
  );
  const homeStats = computed(() => teamStats(plays.value, "home"));
  const awayStats = computed(() => teamStats(plays.value, "away"));
  const status = ref("Lokal gespeichert"),
    ready = ref(false);
  let channel: BroadcastChannel | undefined;
  let receiving = false;
  let mutating = false;
  const snapshot = (): GameSnapshot => ({
    version: 1,
    isDemo: isDemo.value,
    revisions: revisions.value,
    plays: plays.value,
    club: club.value,
    roster: roster.value,
    override: override.value,
    playbook: playbook.value,
    settings: settings.value,
    adjustments: adjustments.value,
  });
  function applySnapshot(saved: GameSnapshot) {
    receiving = true;
    try {
      plays.value = saved.plays;
      revisions.value = saved.revisions;
      club.value = saved.club;
      roster.value = saved.roster;
      override.value = saved.override;
      playbook.value = saved.playbook;
      settings.value = saved.settings;
      adjustments.value = saved.adjustments;
      isDemo.value = saved.isDemo;
    } finally {
      receiving = false;
    }
  }
  function broadcast(serialized: string) {
    // Local durability does not depend on optional cross-tab delivery.
    try {
      channel?.postMessage(JSON.parse(serialized));
    } catch {
      /* another tab can reload */
    }
  }
  const persist = (): boolean => {
    if (!ready.value || receiving || mutating || storageBlocked) return false;
    try {
      const serialized = JSON.stringify(snapshot());
      localStorage.setItem(STORAGE_KEY, serialized);
      broadcast(serialized);
      status.value = "Lokal gespeichert";
      storageError.value = "";
      return true;
    } catch {
      storageError.value =
        "Der Browser konnte die Änderungen nicht speichern. JSON sichern, Speicherplatz prüfen und erneut versuchen. Diese Ansicht enthält weiterhin deine Änderungen.";
      status.value = "Nicht gespeichert";
      return false;
    }
  };
  function transaction<T>(action: () => T): T {
    mutating = true;
    try {
      return action();
    } finally {
      mutating = false;
      persist();
    }
  }
  function exportSnapshot() {
    return JSON.stringify(snapshot(), null, 2);
  }
  function previewRestore(raw: string) {
    return parseSnapshot(raw, snapshot());
  }
  function restore(raw: string) {
    const next = previewRestore(raw);
    try {
      const previous = storageBlocked
        ? localStorage.getItem(STORAGE_KEY)
        : exportSnapshot();
      const serialized = replaceStoredSnapshot(localStorage, next, previous);
      applySnapshot(next);
      previousBackup.value = previous;
      storageBlocked = false;
      recoveryData.value = null;
      storageError.value = "";
      status.value = "Lokal gespeichert";
      broadcast(serialized);
    } catch (error) {
      storageError.value =
        "Wiederherstellen fehlgeschlagen. Der bisherige Spielstand bleibt erhalten. Speicherplatz prüfen und erneut versuchen.";
      throw new Error(storageError.value);
    }
  }
  onMounted(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        recoveryData.value = raw;
        applySnapshot(parseSnapshot(raw, snapshot()));
        recoveryData.value = null;
      }
    } catch {
      storageBlocked = true;
      storageError.value =
        "Gespeicherte Daten sind nicht lesbar. Sie bleiben unverändert erhalten. Original sichern und eine gültige Sicherung laden oder ein neues Spiel starten.";
      status.value = "Speicher prüfen";
    }
    try {
      previousBackup.value = localStorage.getItem(RECOVERY_KEY);
    } catch {
      /* optional recovery copy */
    }
    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("xp-sideline");
        channel.onmessage = (event) => {
          // Do not overwrite unsaved work or a recovery session with a remote tab.
          if (storageBlocked || storageError.value) return;
          try {
            applySnapshot(parseSnapshot(event.data, snapshot()));
          } catch {
            /* ignore invalid tab payload */
          }
        };
      } catch {
        /* cross-tab synchronization is optional */
      }
    }
    ready.value = true;
  });
  watch(
    [
      plays,
      club,
      roster,
      override,
      playbook,
      settings,
      adjustments,
      revisions,
      isDemo,
    ],
    persist,
    { deep: true, flush: "sync" },
  );
  onBeforeUnmount(() => channel?.close());
  function save(input: PlayInput) {
    const play = applyPlay(state.value, input);
    transaction(() => {
      plays.value.push(play);
      override.value = null;
    });
    return play;
  }
  function undo() {
    return transaction(() => {
      const last = plays.value.pop();
      if (last) override.value = { ...last.before };
      return last;
    });
  }
  function control(next: State) {
    transaction(() => {
      adjustments.value.push({
        before: JSON.parse(JSON.stringify(state.value)),
        after: JSON.parse(JSON.stringify(next)),
        at: new Date().toISOString(),
      });
      override.value = next;
    });
  }
  const canUndoControl = computed(
    () =>
      !!adjustments.value.length &&
      JSON.stringify(adjustments.value.at(-1)!.after) ===
        JSON.stringify(state.value),
  );
  function undoControl() {
    if (!canUndoControl.value)
      throw new Error("Zuerst nachfolgende Plays zurücknehmen.");
    transaction(() => {
      override.value = adjustments.value.pop()!.before;
    });
  }
  function nextQuarter() {
    control(nextPeriod(state.value, settings.value.quarterMinutes));
  }
  function overtime(first: "home" | "away") {
    control(startOvertime(state.value, first));
  }
  function nextOvertimeFirst(team: "home" | "away") {
    if (state.value.overtime)
      control({
        ...state.value,
        overtime: { ...state.value.overtime, nextFirst: team },
      });
  }
  function timeout(team: "home" | "away") {
    control(takeTimeout(state.value, team));
  }
  function endGame() {
    if (
      state.value.quarter < 4 ||
      state.value.clock !== 0 ||
      state.value.home === state.value.away ||
      (state.value.phase === "try" &&
        Math.abs(state.value.home - state.value.away) <= 2) ||
      state.value.untimed
    )
      throw new Error(
        "Spiel erst nach Q4 beenden. Offene Plays abschließen; bei Gleichstand Overtime starten.",
      );
    override.value = { ...state.value, ended: true };
  }
  function correct(id: string, input: PlayInput, reason: string) {
    if (!reason.trim()) throw new Error("Review-Grund ergänzen.");
    const previous = JSON.parse(JSON.stringify(plays.value)) as Play[];
    const next = revisePlay(previous, id, input);
    const nextOverride =
      override.value && previous.at(-1)
        ? carryAdjustments(
            next.at(-1)!.after,
            previous.at(-1)!.after,
            override.value,
          )
        : null;
    transaction(() => {
      revisions.value.push({
        id,
        before: previous,
        after: next,
        reason: reason.trim(),
        at: new Date().toISOString(),
      });
      plays.value = next;
      override.value = nextOverride;
    });
  }
  function reset() {
    restore(
      JSON.stringify({
        ...snapshot(),
        isDemo: false,
        plays: [],
        revisions: [],
        adjustments: [],
        override: {
          ...initialState(),
          clock: settings.value.quarterMinutes * 60,
        },
      }),
    );
  }
  function loadDemo() {
    restore(
      JSON.stringify({
        ...snapshot(),
        isDemo: true,
        plays: makeDemo(),
        revisions: [],
        adjustments: [],
        override: null,
      }),
    );
  }
  function adjustSituation(next: State) {
    if (
      [
        next.home,
        next.away,
        next.quarter,
        next.clock,
        next.ball,
        next.down,
        next.distance,
      ].some((n) => !Number.isFinite(n) || !Number.isInteger(n)) ||
      next.home < 0 ||
      next.away < 0 ||
      next.quarter < 1 ||
      next.quarter > (state.value.overtime ? state.value.quarter : 4) ||
      next.clock < 0 ||
      next.clock > settings.value.quarterMinutes * 60 ||
      next.ball < 1 ||
      next.ball > 99 ||
      next.down < 1 ||
      next.down > 4 ||
      next.distance < 1 ||
      next.distance > 100 - next.ball
    )
      throw new Error(
        "Spielsituation prüfen: Ballspot 1–99, Down 1–4, gültige Distanz und Quarterzeit.",
      );
    control(next);
  }
  return {
    isDemo,
    storageError,
    recoveryData,
    previousBackup,
    retrySave: persist,
    exportSnapshot,
    previewRestore,
    restore,
    nextOvertimeFirst,
    canUndoControl,
    undoControl,
    revisions,
    correct,
    overtime,
    timeout,
    endGame,
    playbook,
    settings,
    adjustments,
    adjustSituation,
    loadDemo,
    plays,
    state,
    club,
    roster,
    homeStats,
    awayStats,
    status,
    ready,
    save,
    undo,
    nextQuarter,
    reset,
    blankInput,
  };
}

<script setup lang="ts">
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Flag,
  LayoutDashboard,
  ListFilter,
  Maximize2,
  Menu,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  Radio,
  RotateCcw,
  Settings2,
  Pencil,
  Sun,
  Moon,
  BookOpen,
  Home,
  Shield,
  Target,
  Timer,
  TrendingUp,
  Users,
  X,
  Zap,
} from "@lucide/vue";
import {
  labels,
  clockLabel,
  spotLabel,
  other,
  teamStats,
  filterHalf,
  defensiveCredits,
  statisticalPlays,
  individualYards,
  type Play,
  type State,
  type Kind,
  type PlayInput,
  type Team,
} from "#shared/game";
import type { GameSnapshot } from "#shared/storage";
import { MAX_BACKUP_BYTES } from "#shared/storage";
import { foreground } from "#shared/theme";
const game = useGame();
const offline = useOffline();
const rulesOpen = ref(false);
const reviewing = ref<Play | null>(null);
const reviewError = ref("");
function correctPlay(input: PlayInput, reason: string) {
  try {
    game.correct(reviewing.value!.id, input, reason);
    reviewing.value = null;
    notify("Review gespeichert");
  } catch (e) {
    reviewError.value = (e as Error).message;
  }
}
const otFirst = ref<Team>("home");
function runAction(fn: () => void) {
  try {
    fn();
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
const { plays, state, club, roster, status, settings, playbook, adjustments } =
  game;
const focusMode = ref(false),
  fieldOpen = ref(false),
  moreKinds = ref(false),
  outcomeOpen = ref(false);
const page = ref("live"),
  menuOpen = ref(false),
  drawer = ref<"settings" | "help" | "situation" | null>(null);
const toast = ref(""),
  error = ref(""),
  historyFilter = ref("all"),
  analysisSide = ref<"offense" | "defense">("offense"),
  advanced = ref(false);
const draft = reactive(game.blankInput());
let draftReady = false;
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("sideline-draft") || "null");
    if (saved && JSON.stringify(saved.anchor) === JSON.stringify(state.value))
      Object.assign(draft, saved.input);
  } catch {}
  draftReady = true;
});
watch(
  draft,
  () => {
    if (draftReady) {
      try {
        localStorage.setItem(
          "sideline-draft",
          JSON.stringify({ anchor: state.value, input: draft }),
        );
      } catch {
        notify("Entwurf nicht gesichert. Speicher prüfen.");
      }
    }
  },
  { deep: true },
);
const analysisDown = ref("all"),
  analysisDistance = ref("all");
const half = ref<"all" | "first" | "second" | "ot">("all"),
  callOpen = ref(false),
  analysisCategory = ref("formation"),
  analysisTerm = ref("all");
const periodPlays = computed(() => filterHalf(plays.value, half.value));
const analysisPlays = computed(() => statisticalPlays(periodPlays.value));
const homeStats = computed(() =>
  teamStats(
    page.value === "dashboard" ? periodPlays.value : plays.value,
    "home",
  ),
);
const awayStats = computed(() =>
  teamStats(
    page.value === "dashboard" ? periodPlays.value : plays.value,
    "away",
  ),
);
const statsTeam = computed<Team>(() =>
  analysisSide.value === "offense" ? "home" : "away",
);
const periodLabel = computed(() =>
  half.value === "all"
    ? "GESAMTES SPIEL"
    : half.value === "first"
      ? "1. HALBZEIT"
      : half.value === "ot"
        ? "OVERTIME"
        : "2. HALBZEIT",
);
const situation = reactive({ ...state.value });
const situationClock = ref("");
const holdStart = ref<number | null>(null),
  heldSeconds = ref(0);
let holdInterval: ReturnType<typeof setInterval> | undefined;
function beginHold() {
  if (holdStart.value !== null) return;
  holdStart.value = performance.now();
  heldSeconds.value = 0;
  holdInterval = setInterval(() => {
    heldSeconds.value = Math.round(
      (performance.now() - (holdStart.value || 0)) / 1000,
    );
  }, 100);
}
function finishHold(cancel = false) {
  if (holdStart.value === null) return;
  const elapsed = Math.max(
    1,
    Math.round((performance.now() - holdStart.value) / 1000),
  );
  clearInterval(holdInterval);
  holdStart.value = null;
  if (!cancel) {
    draft.elapsed = Math.min(state.value.clock, elapsed);
    draft.timeEstimated = true;
    notify(`${draft.elapsed} Sekunden als Zeitschätzung übernommen`);
  }
}
onBeforeUnmount(() => clearInterval(holdInterval));
watch(drawer, (value) => {
  if (value === "situation") {
    Object.assign(situation, state.value);
    situationClock.value = clockLabel(state.value.clock);
  }
});
function saveSituation() {
  try {
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(situationClock.value);
    if (!m) throw new Error("Uhrzeit als MM:SS eingeben.");
    game.adjustSituation({
      ...situation,
      clock: Number(m[1]) * 60 + Number(m[2]),
      goalToGo:
        situation.ball > 90 && situation.distance === 100 - situation.ball,
    });
    drawer.value = null;
    notify("Spielsituation korrigiert · Statistik-Plays bleiben erhalten");
  } catch (e) {
    notify((e as Error).message);
  }
}
function startSide(team: Team) {
  analysisSide.value = team === "home" ? "offense" : "defense";
  navigate("dashboard");
}
function selectCall(
  category: keyof PlayInput,
  value: string,
  coverageType?: string,
) {
  Object.assign(draft, { [category]: value });
  if (category === "coverage")
    draft.coverageType = value ? coverageType || "" : "";
}
const callSummary = computed(() => {
  const keys =
    state.value.possession === "home"
      ? ["personnel", "formation", "motion", "tag", "concept"]
      : ["alignment", "coverage", "blitz", "stunt"];
  return (
    keys
      .map((k) => draft[k as keyof PlayInput])
      .filter((v) => v && v !== "Nicht erfasst")
      .join(" · ") || "Playcall"
  );
});
function setHex(key: "primary" | "secondary" | "accent", event: Event) {
  const value = (event.target as HTMLInputElement).value.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) club.value[key] = value;
  else {
    (event.target as HTMLInputElement).value = club.value[key];
    notify("Farbe bitte als #RRGGBB eingeben.");
  }
}
async function uploadLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (
    !["image/jpeg", "image/png"].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  ) {
    notify("Bitte JPEG oder PNG bis 2 MB wählen.");
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    club.value.logo = canvas.toDataURL("image/png");
    bitmap.close();
    notify("Clublogo lokal gespeichert");
  } catch {
    notify("Das Bild konnte nicht gelesen werden.");
  }
}

onMounted(() => {
  focusMode.value = true;
});
const drawerElement = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;
watch(drawer, async (value, previous) => {
  document.body.style.overflow = value ? "hidden" : "";
  if (value) {
    if (!previous) previousFocus = document.activeElement as HTMLElement;
    await nextTick();
    drawerElement.value?.focus();
  } else {
    await nextTick();
    previousFocus?.focus();
  }
});
function trapFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const elements = Array.from(
    drawerElement.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,[tabindex="0"]',
    ) || [],
  ).filter(
    (e) =>
      e.getClientRects().length && !e.classList.contains("visually-hidden"),
  );
  if (!elements?.length) return;
  const first = elements[0]!,
    last = elements[elements.length - 1]!;
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      document.activeElement === drawerElement.value)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
const newPlayer = reactive({
  number: "",
  name: "",
  position: "WR",
  team: "home" as Team,
});
const editingPlayer = ref<{ number: string; team: Team } | null>(null);
const showPlayerForm = ref(false),
  resetConfirm = ref(false),
  clockInput = ref(""),
  importInput = ref<HTMLInputElement | null>(null);
const nav = [
  { id: "setup", name: "Spiel", icon: Home },
  { id: "live", name: "Erfassen", icon: Radio },
  { id: "dashboard", name: "Analyse", icon: LayoutDashboard },
  { id: "history", name: "Verlauf", icon: ClipboardList },
  { id: "roster", name: "Kader", icon: Users },
  { id: "playbook", name: "Playbook", icon: BookOpen },
];
const activeTeam = computed(() =>
  state.value.possession === "home"
    ? club.value.short
    : club.value.opponentShort,
);
const defenseTeam = computed(() =>
  state.value.possession === "home"
    ? club.value.opponentShort
    : club.value.short,
);
const offensePlayers = computed(() =>
  roster.value.filter((p) => p.team === state.value.possession),
);
const defenders = computed(() =>
  roster.value.filter((p) => p.team !== state.value.possession),
);
const filteredPlays = computed(() =>
  [...plays.value]
    .reverse()
    .filter(
      (p) =>
        historyFilter.value === "all" ||
        (historyFilter.value === "scoring" &&
          (p.touchdown ||
            p.safety ||
            (["pat", "two", "fieldgoal"].includes(p.kind) &&
              p.result === "good"))) ||
        (historyFilter.value === "home" && p.before.possession === "home") ||
        (historyFilter.value === "away" && p.before.possession === "away"),
    ),
);
const liveStats = computed(() =>
  teamStats(plays.value, state.value.possession),
);
const selectedStats = computed(() =>
  statsTeam.value === "home" ? homeStats.value : awayStats.value,
);
const availableKinds = computed<Kind[]>(() =>
  state.value.phase === "try"
    ? state.value.overtime && state.value.overtime.round >= 2
      ? ["two"]
      : ["pat", "two"]
    : state.value.phase === "kickoff"
      ? ["kickoff"]
      : [
          "run",
          "pass",
          "sack",
          "penalty",
          "punt",
          "fieldgoal",
          "kneel",
          "spike",
          "grounding",
          "wildsnap",
        ],
);
const visibleKinds = computed(() =>
  focusMode.value && !moreKinds.value && state.value.phase === "scrimmage"
    ? availableKinds.value.filter((kind, i) => i < 3 || kind === draft.kind)
    : availableKinds.value,
);
const resultOptions = computed(() =>
  draft.kind === "pass"
    ? [
        ["normal", "Complete"],
        ["incomplete", "Incomplete"],
        ["interception", "Interception"],
        ["fumble", "Fumble · lost"],
        ["fumble-kept", "Fumble · own"],
        ["fumble-touchback", "Fumble · TB"],
      ]
    : ["run", "sack", "wildsnap"].includes(draft.kind)
      ? [
          ["normal", "Down"],
          ["fumble", "Fumble · lost"],
          ["fumble-kept", "Fumble · own"],
          ["fumble-touchback", "Fumble · TB"],
        ]
      : ["fieldgoal", "pat", "two"].includes(draft.kind)
        ? [
            ["good", "Good"],
            ["missed", "Miss"],
            ["blocked", "Block"],
            ...(draft.kind === "fieldgoal" ? [["muff", "Muff"]] : []),
            ...(["pat", "two"].includes(draft.kind)
              ? [
                  ["defensive-two", "Def. +2"],
                  ["safety-one", "Def. +1"],
                  ["offensive-safety-one", "Off. +1"],
                ]
              : []),
          ]
        : ["punt", "kickoff"].includes(draft.kind)
          ? [
              ["normal", "Return"],
              ["touchback", "Touchback"],
              ["faircatch", "Fair Catch"],
              ["downed", "Downed"],
              ["out", "Out"],
              ...(draft.kind === "punt"
                ? [
                    ["blocked", "Block"],
                    ["muff", "Muff"],
                  ]
                : [["onside", "Onside"]]),
            ]
          : [],
);
const showYards = computed(
  () =>
    !["pat", "two", "spike", "kickoff"].includes(draft.kind) &&
    !["incomplete", "interception"].includes(draft.result),
);
const showReturn = computed(
  () =>
    ["interception", "fumble"].includes(draft.result) ||
    (["punt", "kickoff"].includes(draft.kind) &&
      !["touchback", "faircatch"].includes(draft.result)) ||
    (draft.kind === "fieldgoal" &&
      ["missed", "blocked", "muff"].includes(draft.result)),
);
const preview = computed(() => {
  try {
    return applyPreview();
  } catch {
    return null;
  }
});
function applyPreview() {
  return gamePreview(state.value, { ...draft });
}
import { applyPlay as gamePreview } from "#shared/game";
const previewLabel = computed(() =>
  state.value.ended
    ? "Final"
    : !preview.value
      ? "Eingabe prüfen"
      : preview.value.after.ended
        ? "Final"
        : preview.value?.after.overtime &&
            (preview.value.after.overtime.series !==
              state.value.overtime?.series ||
              preview.value.after.overtime.round !==
                state.value.overtime?.round)
          ? `OT${preview.value.after.overtime.round} · ${preview.value.after.possession === "home" ? club.value.short : club.value.opponentShort}`
          : preview.value?.touchdown
            ? "Touchdown · +6 Punkte"
            : preview.value?.safety
              ? "Safety · +2 Punkte"
              : preview.value?.after.phase === "try"
                ? "Conversion folgt"
                : preview.value?.after.phase === "kickoff"
                  ? "Kickoff folgt"
                  : preview.value?.after.possession !== state.value.possession
                    ? "Ballbesitz wechselt"
                    : `${preview.value?.after.down ?? state.value.down}. & ${preview.value?.after.goalToGo ? "Goal" : (preview.value?.after.distance ?? state.value.distance)} · ${spotLabel(preview.value?.after.ball ?? state.value.ball)}`,
);
const theme = computed(() => ({
  "--club-primary": club.value.primary,
  "--club-secondary": club.value.secondary,
  "--club-accent": club.value.accent,
  "--on-primary": foreground(club.value.primary),
  "--on-secondary": foreground(club.value.secondary),
  "--on-accent": foreground(club.value.accent),
}));
function notify(message: string) {
  toast.value = message;
  setTimeout(() => {
    toast.value = "";
  }, 3500);
}
function keyboard(event: KeyboardEvent) {
  if (
    drawer.value ||
    reviewing.value ||
    page.value !== "live" ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    (event.target as HTMLElement)?.closest("input,select,textarea")
  )
    return;
  const n = Number(event.key) - 1;
  if (/^[1-8]$/.test(event.key) && availableKinds.value[n]) {
    event.preventDefault();
    selectKind(availableKinds.value[n]!);
    if (n >= 3) moreKinds.value = true;
  }
}
onMounted(() => window.addEventListener("keydown", keyboard));
onBeforeUnmount(() => window.removeEventListener("keydown", keyboard));
function navigate(id: string) {
  if (!nav.some((n) => n.id === id)) return;
  page.value = id;
  menuOpen.value = false;
  if (import.meta.client && location.hash !== "#" + id) location.hash = id;
  nextTick(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });
}
function readLocation() {
  const id = location.hash.slice(1);
  page.value = nav.some((n) => n.id === id) ? id : "live";
  drawer.value = null;
  menuOpen.value = false;
  nextTick(() => window.scrollTo({ top: 0 }));
}
onMounted(() => {
  readLocation();
  window.addEventListener("hashchange", readLocation);
});
onBeforeUnmount(() => window.removeEventListener("hashchange", readLocation));
useHead({
  title: computed(
    () => `${nav.find((n) => n.id === page.value)?.name} · MIDFIELD`,
  ),
});
function selectKind(kind: Kind) {
  outcomeOpen.value = false;
  draft.kind = kind;
  draft.returns = [];
  draft.laterals = [];
  draft.penalties = [];
  draft.recoveryTeam = undefined;
  draft.blockedBy = "";
  draft.untimedAfter = false;
  draft.yards = kind === "sack" ? -5 : kind === "kneel" ? -1 : 0;
  draft.result = ["pat", "two", "fieldgoal"].includes(kind) ? "good" : "normal";
  draft.penaltyTeam = state.value.possession;
  const position = ["pass", "sack", "spike", "kneel", "two"].includes(kind)
    ? "QB"
    : ["pat", "punt", "kickoff", "fieldgoal"].includes(kind)
      ? "K"
      : "RB";
  draft.player =
    offensePlayers.value.find((p) => p.position === position)?.number || "";
  draft.target =
    offensePlayers.value.find((p) => p.position === "WR")?.number || "";
  error.value = "";
}
watch(
  () => state.value.phase,
  () => selectKind(availableKinds.value[0] || "run"),
  { flush: "sync" },
);
watch(
  () => state.value.possession,
  () => selectKind(availableKinds.value[0] || "run"),
  { flush: "sync" },
);
watch(
  () => draft.result,
  () => {
    if (["incomplete", "interception"].includes(draft.result)) draft.yards = 0;
  },
);
function chooseSpot(spot: number) {
  if (["run", "pass", "sack", "kneel"].includes(draft.kind))
    draft.yards = spot - state.value.ball;
}
function savePlay() {
  try {
    if (draft.tackler && draft.tackler === draft.assist)
      throw new Error("Tackler und Assist müssen verschiedene Spieler sein.");
    const p = game.save({
      ...draft,
      airYards:
        draft.airYards === null || String(draft.airYards) === ""
          ? null
          : Number(draft.airYards),
    });
    const next = availableKinds.value[0] || "run";
    Object.assign(draft, game.blankInput());
    selectKind(next);
    outcomeOpen.value = false;
    rulesOpen.value = false;
    advanced.value = false;
    callOpen.value = false;
    moreKinds.value = false;
    error.value = "";
    notify(
      `${labels[p.kind]} ${p.yards > 0 ? "+" : ""}${p.yards} Yards gespeichert${p.touchdown ? " · TOUCHDOWN!" : ""}`,
    );
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function undoPlay() {
  const last = game.undo();
  if (last) {
    Object.assign(draft, last);
    notify(
      "Letzten Spielzug zurückgenommen. Eingabe zur Korrektur wiederhergestellt.",
    );
    page.value = "live";
  }
}
function playerName(number: string, team: Team) {
  return (
    roster.value.find((p) => p.number === number && p.team === team)?.name ||
    "Spieler offen"
  );
}
function playDescription(p: (typeof plays.value)[number]) {
  if (p.kind === "penalty")
    return `${p.penaltyTeam === "home" ? club.value.short : club.value.opponentShort} · ${p.note || "Strafe"} · ${p.yards} Yds`;
  if (p.kind === "spike" || p.kind === "kneel") return "Team-Spielzug";
  if (p.kind === "pass")
    return `#${p.player || "?"} → #${p.target || "?"} · ${p.result === "incomplete" ? "Incomplete" : p.result === "interception" ? "Interception" : playerName(p.target, p.before.possession)}`;
  return `#${p.player || "?"} ${playerName(p.player, p.before.possession)}${p.result === "good" ? " · Erfolgreich" : p.result === "missed" ? " · Fehlversuch" : p.result === "touchback" ? " · Touchback" : ""}`;
}
const halftimeComparison = computed(() =>
  ["first", "second"].map((h) => ({
    half: h,
    stats: teamStats(
      filterHalf(plays.value, h as "first" | "second"),
      statsTeam.value,
    ),
  })),
);
const breakdownRows = computed(() => {
  const events = analysisPlays.value.filter(
    (p) =>
      p.before.possession === statsTeam.value &&
      ["run", "pass", "sack", "kneel", "spike"].includes(p.kind),
  );
  const filtered = events.filter(
    (p) =>
      (analysisDown.value === "all" ||
        p.before.down === Number(analysisDown.value)) &&
      (analysisDistance.value === "all" ||
        (analysisDistance.value === "short" && p.before.distance <= 3) ||
        (analysisDistance.value === "medium" &&
          p.before.distance >= 4 &&
          p.before.distance <= 6) ||
        (analysisDistance.value === "long" && p.before.distance >= 7)),
  );
  const key = analysisCategory.value as keyof PlayInput;
  const names = [
    ...new Set(filtered.map((p) => String(p[key] || "Nicht erfasst"))),
  ];
  return names
    .filter(
      (name) => analysisTerm.value === "all" || name === analysisTerm.value,
    )
    .map((name) => {
      const items = filtered.filter(
        (p) => String(p[key] || "Nicht erfasst") === name,
      );
      const runs = items.filter((p) =>
          ["run", "sack", "kneel"].includes(p.kind),
        ),
        passes = items.filter((p) => ["pass", "spike"].includes(p.kind));
      return {
        name,
        plays: items.length,
        ypp: (items.reduce((n, p) => n + p.yards, 0) / items.length).toFixed(1),
        run: items.length ? Math.round((runs.length / items.length) * 100) : 0,
        runYpp: runs.length
          ? (runs.reduce((n, p) => n + p.yards, 0) / runs.length).toFixed(1)
          : "—",
        passYpp: passes.length
          ? (passes.reduce((n, p) => n + p.yards, 0) / passes.length).toFixed(1)
          : "—",
        success: Math.round(
          (items.filter((p) => p.success).length / items.length) * 100,
        ),
      };
    });
});
const breakdownOptions = computed(() => [
  ...new Set(
    analysisPlays.value
      .filter((p) => p.before.possession === statsTeam.value)
      .map((p) =>
        String(p[analysisCategory.value as keyof PlayInput] || "Nicht erfasst"),
      ),
  ),
]);
watch(
  [half, analysisCategory, analysisSide, analysisDown, analysisDistance],
  () => (analysisTerm.value = "all"),
);
const currentDrive = computed(() =>
  plays.value.filter((p) => p.before.drive === state.value.drive),
);
const driveYards = computed(() =>
  currentDrive.value
    .filter((p) => ["run", "pass", "sack", "kneel"].includes(p.kind))
    .reduce((s, p) => s + p.yards, 0),
);
const defenseCredits = computed(() =>
  roster.value
    .filter((p) => p.team === "home")
    .map((p) => ({
      ...p,
      ...defensiveCredits(analysisPlays.value, "home", p.number),
    })),
);
const returnCredits = computed(() => {
  const rows = new Map<
    string,
    {
      team: Team;
      player: string;
      kind: string;
      yards: number;
      attempts: number;
      td: number;
    }
  >();
  for (const p of analysisPlays.value.filter((p) => p.before.phase !== "try")) {
    let category = "";
    for (const r of p.returns || []) {
      if (r.type !== "lateral") category = r.type;
      const key = `${r.team}:${r.player}:${category}`;
      const row = rows.get(key) || {
        team: r.team,
        player: r.player,
        kind: category,
        yards: 0,
        attempts: 0,
        td: 0,
      };
      row.yards += r.to - r.from;
      row.attempts += r.type === "lateral" ? 0 : 1;
      row.td += r.to === 100 ? 1 : 0;
      rows.set(key, row);
    }
  }
  return [...rows.values()];
});
const playerStats = computed(() =>
  roster.value
    .filter((p) => p.team === statsTeam.value)
    .map((player) => {
      const personal = analysisPlays.value.filter(
        (p) =>
          p.before.possession === statsTeam.value &&
          p.player === player.number &&
          !["kneel", "spike", "penalty"].includes(p.kind),
      );
      const runs = personal.filter((p) => ["run", "sack"].includes(p.kind));
      const teamRuns = analysisPlays.value.filter(
        (p) =>
          p.before.possession === statsTeam.value &&
          ["run", "sack"].includes(p.kind),
      );
      const teamPasses = analysisPlays.value.filter(
        (p) => p.before.possession === statsTeam.value && p.kind === "pass",
      );
      const passes = personal.filter((p) => p.kind === "pass");
      const receptions = analysisPlays.value.filter(
        (p) =>
          p.before.possession === statsTeam.value &&
          p.kind === "pass" &&
          p.target === player.number &&
          !["interception", "incomplete"].includes(p.result),
      );
      const credits = defensiveCredits(
        analysisPlays.value,
        statsTeam.value,
        player.number,
      );
      return {
        ...player,
        rushYards: teamRuns.reduce(
          (n, p) => n + individualYards(p, player.number),
          0,
        ),
        rushAtt: runs.length,
        passYards: passes.reduce((n, p) => n + p.yards, 0),
        attempts: passes.length,
        completions: passes.filter(
          (p) => !["incomplete", "interception"].includes(p.result),
        ).length,
        receptions: receptions.length,
        recYards: teamPasses.reduce(
          (n, p) => n + individualYards(p, player.number),
          0,
        ),
        tackles: credits.solo,
        assists: credits.assists,
        sacks: credits.sacks,
      };
    }),
);
const tendencies = computed(() =>
  ["Links", "Mitte", "Rechts"].map((direction) => {
    const entries = analysisPlays.value.filter(
      (p) =>
        p.before.possession === statsTeam.value &&
        ["run", "pass", "sack"].includes(p.kind) &&
        p.direction === direction,
    );
    return {
      direction,
      count: entries.length,
      yards: entries.reduce((n, p) => n + p.yards, 0),
      success: entries.length
        ? Math.round(
            (entries.filter((p) => p.success).length / entries.length) * 100,
          )
        : 0,
    };
  }),
);
const advancedStats = computed(() => {
  const entries = analysisPlays.value.filter(
    (p) => p.before.possession === statsTeam.value,
  );
  const air = entries.filter(
    (p) =>
      p.kind === "pass" &&
      p.airYards !== null &&
      !["incomplete", "interception"].includes(p.result),
  );
  const kicks = entries.filter((p) => p.kind === "fieldgoal");
  return {
    airPlays: air.length,
    airYards: air.reduce((n, p) => n + (p.airYards || 0), 0),
    yac: air.reduce((n, p) => n + p.yards - (p.airYards || 0), 0),
    fieldGoals: kicks.length,
    fieldGoalsMade: kicks.filter((p) => p.result === "good").length,
    punts: entries.filter((p) => p.kind === "punt").length,
    puntYards: entries
      .filter((p) => p.kind === "punt")
      .reduce((n, p) => n + p.yards, 0),
  };
});
const comparison = computed(() => [
  {
    label: "Total Yards",
    home: homeStats.value.yards,
    away: awayStats.value.yards,
  },
  {
    label: "Passing",
    home: homeStats.value.passYards,
    away: awayStats.value.passYards,
  },
  {
    label: "Rushing",
    home: homeStats.value.rushYards,
    away: awayStats.value.rushYards,
  },
  {
    label: "First Downs",
    home: homeStats.value.firstDowns,
    away: awayStats.value.firstDowns,
  },
]);
function exportFile(format: "json" | "csv") {
  let content: string;
  if (format === "json") content = game.exportSnapshot();
  else {
    const cell = (v: unknown) =>
      '"' +
      String(v)
        .replace(/"/g, '""')
        .replace(/^[\s]*[=+@-]/, "'") +
      '"';
    content =
      "Quarter,Clock,Team,Down,Distance,Spot,Type,Yards,Player,Target,Result,Formation,Direction,AirYards,Tackler,Assist,Note,Personnel,Motion,Tag,Concept,Alignment,Coverage,CoverageType,Blitz,Stunt,TimeEstimated,Interceptor,ForcedBy,RecoveredBy,Breakup,Overtime,Returns,Laterals,Penalties,CountsStats\n" +
      plays.value
        .map((p) =>
          [
            p.before.quarter,
            clockLabel(p.before.clock),
            p.before.possession,
            p.before.down,
            p.before.distance,
            p.before.ball,
            p.kind,
            p.yards,
            p.player,
            p.target,
            p.result,
            p.formation,
            p.direction,
            p.airYards ?? "",
            p.tackler,
            p.assist,
            p.note,
            p.personnel || "",
            p.motion || "",
            p.tag || "",
            p.concept || "",
            p.alignment || "",
            p.coverage || "",
            p.coverageType || "",
            p.blitz || "",
            p.stunt || "",
            p.timeEstimated || false,
            p.interceptor || "",
            p.forcedBy || "",
            p.recoveredBy || "",
            p.breakup || "",
            p.before.overtime?.round || "",
            JSON.stringify(p.returns || []),
            JSON.stringify(p.laterals || []),
            JSON.stringify(p.penalties || []),
            p.countsStats !== false,
          ]
            .map(cell)
            .join(","),
        )
        .join("\n");
    const home = teamStats(plays.value, "home"),
      away = teamStats(plays.value, "away");
    content +=
      "\n\nStatistik," +
      cell(club.value.short) +
      "," +
      cell(club.value.opponentShort) +
      "\n" +
      [
        ["Total Yards", home.yards, away.yards],
        ["Passing Yards", home.passYards, away.passYards],
        ["Rushing Yards", home.rushYards, away.rushYards],
        ["Yards per Play", home.ypp, away.ypp],
        ["Success Rate", home.success, away.success],
        ["First Downs", home.firstDowns, away.firstDowns],
        ["Turnovers", home.turnovers, away.turnovers],
      ]
        .map((row) => row.map(cell).join(","))
        .join("\n");
  }
  const url = URL.createObjectURL(
    new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `midfield-${club.value.short.toLowerCase()}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`${format.toUpperCase()}-Download gestartet`);
}
const backupFile = ref("");
const backupText = ref("");
const backupPreview = ref<GameSnapshot | null>(null);
const backupError = ref("");
const demoConfirm = ref(false);
const rosterError = ref("");
function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function readBackup(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  backupPreview.value = null;
  backupError.value = "";
  backupText.value = "";
  if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error(
        "Datei zu groß. Eine MIDFIELD-JSON-Datei bis 8 MB wählen.",
      );
    backupText.value = await file.text();
    backupPreview.value = game.previewRestore(backupText.value);
    backupFile.value = file.name;
  } catch (e) {
    backupError.value = (e as Error).message;
  }
  input.value = "";
}
function restoreBackup() {
  try {
    game.restore(backupText.value);
    backupPreview.value = null;
    backupText.value = "";
    backupError.value = "";
    Object.assign(draft, game.blankInput());
    selectKind(availableKinds.value[0] || "run");
    notify("Sicherung wiederhergestellt");
  } catch (e) {
    backupError.value = (e as Error).message;
  }
}
function newMatch(demo = false) {
  try {
    if (demo) game.loadDemo();
    else game.reset();
    resetConfirm.value = false;
    demoConfirm.value = false;
    drawer.value = null;
    Object.assign(draft, game.blankInput());
    selectKind(availableKinds.value[0] || "run");
    navigate("live");
    notify(demo ? "Demospiel geladen" : "Neues Spiel angelegt");
  } catch (e) {
    backupError.value = (e as Error).message;
  }
}
function editPlayer(p: (typeof roster.value)[number]) {
  editingPlayer.value = { number: p.number, team: p.team };
  Object.assign(newPlayer, p);
  showPlayerForm.value = true;
}
function addPlayer() {
  rosterError.value = "";
  if (!/^\d{1,2}$/.test(newPlayer.number) || !newPlayer.name.trim()) {
    rosterError.value = "Name und Trikotnummer 0–99 eingeben.";
    return;
  }
  if (editingPlayer.value) {
    const current = roster.value.find(
      (p) =>
        p.number === editingPlayer.value?.number &&
        p.team === editingPlayer.value?.team,
    );
    if (current) {
      current.name = newPlayer.name.trim();
      current.position = newPlayer.position;
    }
    editingPlayer.value = null;
    showPlayerForm.value = false;
    notify("Spieler aktualisiert");
    return;
  }
  if (
    roster.value.some(
      (p) => p.team === newPlayer.team && p.number === newPlayer.number,
    )
  ) {
    rosterError.value = "Diese Trikotnummer ist bereits vergeben.";
    return;
  }
  roster.value.push({ ...newPlayer, name: newPlayer.name.trim() });
  showPlayerForm.value = false;
  Object.assign(newPlayer, {
    number: "",
    name: "",
    position: "WR",
    team: "home",
  });
  notify("Spieler zum Kader hinzugefügt");
}
function setClock() {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(clockInput.value);
  if (!match) {
    notify("Zeit bitte als MM:SS eingeben.");
    return;
  }
  const next = Number(match[1]) * 60 + Number(match[2]);
  if (next > state.value.clock) {
    notify("Endzeit muss vor der aktuellen Uhrzeit liegen.");
    return;
  }
  draft.elapsed = state.value.clock - next;
  drawer.value = null;
}
function advanceQuarter() {
  try {
    game.nextQuarter();
    drawer.value = null;
    notify("Nächstes Quarter gestartet");
  } catch (e) {
    notify((e as Error).message);
  }
}
</script>

<template>
  <div
    class="app-shell"
    :data-ready="game.ready.value"
    :data-offline-phase="offline.phase.value"
    :class="{
      'focus-mode': focusMode && page === 'live',
      'field-open': fieldOpen,
      'night-mode': settings.night,
      'native-live': page === 'live',
    }"
    :style="theme"
  >
    <ReviewPlay
      v-if="reviewing"
      :key="reviewing.id"
      :play="reviewing"
      :roster="roster"
      :home="club.short"
      :away="club.opponentShort"
      @close="reviewing = null"
      @save="correctPlay"
      ><p v-if="reviewError" class="error-message" role="alert">
        {{ reviewError }}
      </p></ReviewPlay
    >
    <div
      v-if="menuOpen"
      class="sidebar-backdrop"
      @click="menuOpen = false"
    ></div>
    <aside class="sidebar" :inert="!!drawer" :class="{ open: menuOpen }">
      <button
        class="brand"
        aria-label="MIDFIELD Startseite"
        @click="navigate('setup')"
      >
        <span class="brand-mark" aria-hidden="true">M</span
        ><span class="brand-name">MIDFIELD<span>EVERY PLAY COUNTS.</span></span>
      </button>
      <button class="club-switch" @click="drawer = 'settings'">
        <div class="club-emblem"><Shield :size="21" /></div>
        <span>{{ club.name }}<small>Club Workspace</small></span
        ><ChevronDown :size="15" />
      </button>
      <span class="nav-label">GAMEDAY</span>
      <nav aria-label="Hauptnavigation">
        <button
          v-for="item in nav"
          :key="item.id"
          :class="{ active: page === item.id }"
          :aria-label="item.name"
          :title="item.name"
          @click="navigate(item.id)"
        >
          <component :is="item.icon" :size="19" /><span>{{ item.name }}</span
          ><span v-if="item.id === 'live'" class="nav-live-dot"></span>
        </button>
      </nav>
      <div class="sidebar-game">
        <span class="eyebrow">AKTUELLES SPIEL</span>
        <div class="mini-match">
          {{ club.short }} <span>vs.</span> {{ club.opponentShort }}
        </div>
        <small>{{
          game.isDemo.value ? "Demospiel · Beispieldaten" : "Aktuelles Spiel"
        }}</small>
        <div class="game-status">
          <span class="tiny-dot"></span> Erfassung aktiv
        </div>
      </div>
      <div class="sidebar-bottom">
        <button @click="drawer = 'settings'">
          <Settings2 :size="19" /> Einstellungen</button
        ><button @click="drawer = 'help'">
          <CircleHelp :size="19" /> Kurzanleitung
        </button>
        <div class="operator">
          <div class="avatar">MC</div>
          <span>MIDFIELD Crew<small>Lokaler Arbeitsbereich</small></span
          ><span class="operator-dot"></span>
        </div>
      </div>
    </aside>
    <div class="workspace" :inert="!!drawer">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            class="icon-button menu-toggle"
            aria-label="Menü öffnen"
            @click="menuOpen = true"
          >
            <Menu :size="22" /></button
          ><button
            class="app-wordmark"
            aria-label="MIDFIELD Spielübersicht"
            @click="navigate('setup')"
          >
            MIDFIELD</button
          ><span class="topbar-divider"></span
          ><strong class="current-view">{{
            nav.find((n) => n.id === page)?.name
          }}</strong
          ><span v-if="game.isDemo.value" class="demo-pill">DEMO</span>
        </div>
        <nav class="tab-dock" aria-label="Ansichten">
          <button
            v-for="item in nav"
            :key="item.id"
            :class="{ active: page === item.id }"
            :aria-current="page === item.id ? 'page' : undefined"
            @click="navigate(item.id)"
          >
            <component :is="item.icon" :size="22" /><span>{{ item.name }}</span>
          </button>
        </nav>
        <div class="topbar-right">
          <button
            v-if="page === 'live'"
            class="icon-button focus-access"
            aria-label="Fokusmodus umschalten"
            @click="focusMode = !focusMode"
          >
            <Maximize2 :size="18" /></button
          ><button
            class="icon-button theme-toggle"
            :aria-label="
              settings.night ? 'Tagmodus aktivieren' : 'Nachtmodus aktivieren'
            "
            @click="settings.night = !settings.night"
          >
            <Sun v-if="settings.night" :size="19" /><Moon
              v-else
              :size="19"
            /></button
          ><span class="save-state"
            ><CheckCheck :size="16" />
            {{ status === "Lokal gespeichert" ? "Gesichert" : status }}</span
          ><span
            class="offline-state"
            :class="{ ready: offline.available.value }"
            >{{ offline.label.value }}</span
          ><button
            class="icon-button settings-access"
            aria-label="Clubfarben einstellen"
            @click="drawer = 'settings'"
          >
            <Palette :size="19" /></button
          ><button
            class="icon-button"
            aria-label="Anleitung öffnen"
            @click="drawer = 'help'"
          >
            <CircleHelp :size="20" />
          </button>
          <div class="avatar small">SC</div>
        </div>
      </header>
      <div v-if="game.storageError.value" class="storage-alert" role="alert">
        <div>
          <strong>Speicherung prüfen</strong>
          <p>{{ game.storageError.value }}</p>
        </div>
        <button class="button light" @click="game.retrySave()">Erneut</button>
        <button class="button light" @click="exportFile('json')">
          Sichern
        </button>
      </div>
      <main
        id="main-content"
        tabindex="-1"
        :aria-label="nav.find((n) => n.id === page)?.name"
      >
        <div class="page-heading">
          <div>
            <div class="eyebrow">
              <span class="tiny-dot"></span> GAMEDAY WORKSPACE
              <span v-if="game.isDemo.value" class="demo-label">DEMOSPIEL</span>
            </div>
            <h1>
              {{
                page === "setup"
                  ? "Bereit für den nächsten Play."
                  : page === "playbook"
                    ? "Playbook"
                    : page === "live"
                      ? "Nah am Spiel. Jeder Play zählt."
                      : page === "dashboard"
                        ? "Spielanalyse"
                        : page === "history"
                          ? "Spielverlauf"
                          : "Gameday-Kader"
              }}
            </h1>
            <p>
              {{
                page === "setup"
                  ? game.isDemo.value
                    ? "Demospiel mit Beispieldaten. Alle Funktionen sind direkt ausprobierbar."
                    : "Erfassung fortsetzen oder das Spiel auswerten."
                  : page === "playbook"
                    ? "Einmal vorbereiten. Im Spiel nur noch antippen."
                    : page === "live"
                      ? "Schnell erfassen. Sofort verstehen."
                      : page === "dashboard"
                        ? "Alle Auswertungen aktualisieren sich mit jedem erfassten Spielzug."
                        : page === "history"
                          ? "Das Protokoll ist die gemeinsame Grundlage aller Statistiken."
                          : "Spieler auswählen statt Namen tippen – direkt an der Sideline."
              }}
            </p>
          </div>
          <div class="heading-actions">
            <button
              v-if="page === 'live'"
              class="button light focus-button"
              :class="{ enabled: focusMode }"
              @click="focusMode = !focusMode"
            >
              <Maximize2 :size="17" />
              {{ focusMode ? "Übersicht" : "Fokusmodus" }}</button
            ><button
              class="button light export-button"
              @click="exportFile('csv')"
            >
              <ArrowDownToLine :size="17" /> Export
            </button>
          </div>
        </div>
        <FieldlineScore
          :state="state"
          :club="club"
          @settings="drawer = 'settings'"
          @situation="
            drawer = 'situation';
            clockInput = clockLabel(state.clock);
          "
        />

        <template v-if="page === 'setup'">
          <section class="game-launch">
            <div>
              <span class="eyebrow">{{
                state.ended ? "SPIEL BEENDET" : "AKTUELLER SPIELSTAND"
              }}</span>
              <h2>{{ club.short }} vs. {{ club.opponentShort }}</h2>
              <p>
                {{ plays.length }} Plays erfasst ·
                {{ game.isDemo.value ? "Beispieldaten" : "Auf diesem Gerät" }}
              </p>
            </div>
            <button class="button primary" @click="navigate('live')">
              <Radio :size="20" />{{ state.ended ? "Zum Spiel" : "Erfassen"
              }}<ArrowRight :size="20" />
            </button>
          </section>
          <div class="setup-cards">
            <button class="setup-card offense-card" @click="startSide('home')">
              <span class="setup-card-icon"><ArrowUpRight :size="34" /></span
              ><span class="eyebrow">UNSERE OFFENSE</span
              ><strong>Offense</strong>
              <p>
                Yards, Conversions und Playcalls.<br />So kommt eure Offense
                voran.
              </p>
              <span class="setup-card-footer"
                >{{ homeStats.plays }} Plays <i>·</i> {{ homeStats.ypp }} Yds /
                Play <ArrowRight :size="22"
              /></span></button
            ><button class="setup-card defense-card" @click="startSide('away')">
              <span class="setup-card-icon"><Shield :size="34" /></span
              ><span class="eyebrow">UNSERE DEFENSE</span
              ><strong>Defense</strong>
              <p>
                Zugelassene Yards und Defense-Credits.<br />So stoppt ihr den
                Gegner.
              </p>
              <span class="setup-card-footer"
                >{{ awayStats.plays }} Plays <i>·</i> {{ awayStats.ypp }} Yds
                zugelassen <ArrowRight :size="22"
              /></span>
            </button>
          </div>
          <div class="setup-tools">
            <button class="panel" @click="navigate('playbook')">
              <BookOpen :size="24" /><span
                ><strong>Playbook</strong
                ><small
                  >{{ playbook.length }} eigene Begriffe · Offense &
                  Defense</small
                ></span
              ><ChevronRight :size="18" /></button
            ><button class="panel" @click="drawer = 'settings'">
              <Palette :size="24" /><span
                ><strong>Club & Spiel</strong
                ><small>Logo, Farben, Gegner und Quarterlänge</small></span
              ><ChevronRight :size="18" />
            </button></div
        ></template>
        <template v-else-if="page === 'playbook'"
          ><PlaybookEditor v-model="playbook"
        /></template>
        <template v-else-if="page === 'live'">
          <div class="live-layout">
            <div class="capture-column">
              <section class="fieldline-context" aria-label="Spielsituation">
                <div class="fieldline-context-row">
                  <button
                    @click="drawer = 'situation'"
                    aria-label="Down und Distanz bearbeiten"
                  >
                    <small>Down</small
                    ><strong>{{
                      state.ended
                        ? "Final"
                        : state.phase === "try"
                          ? "Conversion"
                          : state.phase === "kickoff"
                            ? "Kickoff"
                            : state.down +
                              ". & " +
                              (state.goalToGo ? "Goal" : state.distance)
                    }}</strong>
                  </button>
                  <button
                    @click="fieldOpen = !fieldOpen"
                    :aria-expanded="fieldOpen"
                    aria-label="Feld öffnen"
                  >
                    <small>Spot</small
                    ><strong>{{ spotLabel(state.ball) }}</strong
                    ><ChevronDown :size="15" />
                  </button>
                  <span
                    ><small>Angriff</small
                    ><strong>{{ activeTeam }}</strong></span
                  >
                  <span class="fieldline-drive"
                    ><small>Drive {{ state.drive }}</small
                    >{{ currentDrive.length }} Plays ·
                    {{ driveYards }} Yds</span
                  >
                </div>
                <FootballField
                  v-if="fieldOpen"
                  :ball="state.ball"
                  :distance="state.distance"
                  :gain="
                    showYards &&
                    !['penalty', 'punt', 'fieldgoal'].includes(draft.kind)
                      ? draft.yards
                      : 0
                  "
                  :team="activeTeam"
                  :opponent="defenseTeam"
                  @spot="chooseSpot"
                />
              </section>
              <section class="panel capture-panel">
                <div class="panel-heading">
                  <h2>Spielzug erfassen</h2>
                  <div class="capture-header-actions">
                    <button
                      v-if="focusMode && state.phase === 'scrimmage'"
                      class="subtle-button more-kinds"
                      :aria-expanded="moreKinds"
                      @click="moreKinds = !moreKinds"
                    >
                      <Plus :size="14" />
                      {{ moreKinds ? "Weniger" : "Mehr" }}</button
                    ><button
                      class="subtle-button"
                      :disabled="!plays.length"
                      @click="undoPlay"
                    >
                      <RotateCcw :size="15" /> Rückgängig
                    </button>
                  </div>
                </div>
                <div
                  class="fieldline-entry"
                  :class="{ 'without-yards': !showYards }"
                >
                  <div class="fieldline-choices">
                    <strong class="fieldline-label">Spielzug</strong>
                    <div class="play-type-grid">
                      <button
                        v-for="(kind, i) in visibleKinds"
                        :key="kind"
                        :class="{ selected: draft.kind === kind }"
                        :aria-pressed="draft.kind === kind"
                        @click="selectKind(kind)"
                      >
                        <component
                          :is="
                            kind === 'run'
                              ? ArrowRight
                              : kind === 'pass'
                                ? ArrowUpRight
                                : kind === 'penalty'
                                  ? Flag
                                  : kind === 'sack'
                                    ? Shield
                                    : kind === 'kneel'
                                      ? ArrowLeft
                                      : kind === 'spike'
                                        ? ArrowDownToLine
                                        : Target
                          "
                          :size="22"
                        /><span>{{ labels[kind] }}</span
                        ><small>{{ i + 1 }}</small>
                      </button>
                    </div>
                    <div class="capture-details">
                      <div class="input-section">
                        <label>{{
                          draft.kind === "penalty"
                            ? "STRAFE GEGEN"
                            : [
                                  "kneel",
                                  "spike",
                                  "grounding",
                                  "wildsnap",
                                ].includes(draft.kind)
                              ? "ZUORDNUNG"
                              : draft.kind === "run"
                                ? "Ballträger"
                                : draft.kind === "pass"
                                  ? "Quarterback"
                                  : "Spieler"
                        }}</label>
                        <div v-if="draft.kind === 'penalty'" class="segmented">
                          <button
                            :class="{ selected: draft.penaltyTeam === 'home' }"
                            @click="draft.penaltyTeam = 'home'"
                          >
                            {{ club.short }}</button
                          ><button
                            :class="{ selected: draft.penaltyTeam === 'away' }"
                            @click="draft.penaltyTeam = 'away'"
                          >
                            {{ club.opponentShort }}
                          </button>
                        </div>
                        <div
                          v-else-if="
                            [
                              'kneel',
                              'spike',
                              'grounding',
                              'wildsnap',
                            ].includes(draft.kind)
                          "
                          class="team-attribution"
                        >
                          {{ activeTeam }} · Team-Statistik
                        </div>
                        <QuickPlayer
                          v-else
                          v-model="draft.player"
                          :players="offensePlayers"
                          label="Spieler"
                          :preferred="
                            ['pass', 'sack', 'two'].includes(draft.kind)
                              ? ['QB', 'RB', 'WR']
                              : [
                                    'punt',
                                    'kickoff',
                                    'fieldgoal',
                                    'pat',
                                  ].includes(draft.kind)
                                ? ['K', 'P']
                                : ['RB', 'QB', 'WR']
                          "
                        />
                      </div>
                      <div v-if="draft.kind === 'pass'" class="input-section">
                        <label>Receiver</label
                        ><QuickPlayer
                          v-model="draft.target"
                          :players="offensePlayers"
                          label="Receiver"
                          :preferred="['WR', 'TE', 'RB']"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-if="showYards" class="yard-entry">
                    <div class="yard-title">
                      <label>{{
                        draft.kind === "penalty"
                          ? "TATSÄCHLICHE STRAF-YARDS"
                          : draft.kind === "punt"
                            ? "PUNT-YARDS"
                            : draft.kind === "fieldgoal"
                              ? "KICK-DISTANZ"
                              : "Raumgewinn"
                      }}</label
                      ><span>Yards</span>
                    </div>
                    <div class="yard-controls">
                      <button
                        class="square-button"
                        aria-label="Ein Yard weniger"
                        @click="draft.yards--"
                      >
                        <Minus :size="21" /></button
                      ><input
                        v-model.number="draft.yards"
                        type="number"
                        aria-label="Yards"
                        min="-99"
                        max="100"
                      /><button
                        class="square-button"
                        aria-label="Ein Yard mehr"
                        @click="draft.yards++"
                      >
                        <Plus :size="21" />
                      </button>
                      <div class="quick-yards">
                        <button
                          v-for="n in draft.kind === 'sack'
                            ? [-10, -5, -3, -1]
                            : [0, 3, 5, 10]"
                          :key="n"
                          :class="{ selected: draft.yards === n }"
                          :aria-pressed="draft.yards === n"
                          @click="draft.yards = n"
                        >
                          {{ n > 0 ? "+" : "" }}{{ n }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="fieldline-tools">
                  <button
                    v-if="['run', 'sack'].includes(draft.kind)"
                    class="detail-toggle"
                    :aria-expanded="outcomeOpen"
                    @click="outcomeOpen = !outcomeOpen"
                  >
                    <ChevronDown :size="16" />{{
                      draft.result === "normal"
                        ? "Ergebnis"
                        : resultOptions.find((o) => o[0] === draft.result)?.[1]
                    }}<template
                      v-if="
                        draft.direction && draft.direction !== 'Nicht erfasst'
                      "
                    >
                      · {{ draft.direction }}</template
                    >
                  </button>
                  <button
                    class="call-summary"
                    :aria-expanded="callOpen"
                    @click="callOpen = !callOpen"
                  >
                    <BookOpen :size="16" /><span
                      ><b>{{
                        state.possession === "home"
                          ? "OFFENSE CALL"
                          : "DEFENSE CALL"
                      }}</b
                      >{{ callSummary }}</span
                    ><ChevronDown :size="16" />
                  </button>
                  <button
                    class="detail-toggle ruling-toggle"
                    :aria-expanded="rulesOpen"
                    @click="rulesOpen = !rulesOpen"
                  >
                    <Flag :size="17" /> Ruling
                    <span>{{
                      (draft.penalties?.length || 0) +
                        (draft.returns?.length || 0) +
                        (draft.laterals?.length || 0) || ""
                    }}</span
                    ><ChevronDown :size="16" />
                  </button>
                  <button
                    class="detail-toggle"
                    :aria-expanded="advanced"
                    @click="advanced = !advanced"
                  >
                    <Plus v-if="!advanced" :size="16" /><Minus
                      v-else
                      :size="16"
                    />
                    Details <span>Defense · Uhr · Notiz</span
                    ><ChevronDown :size="15" />
                  </button>
                </div>
                <CallPicker
                  v-if="callOpen"
                  :draft="draft"
                  :entries="playbook"
                  :side="state.possession === 'home' ? 'offense' : 'defense'"
                  @select="selectCall"
                  @done="callOpen = false"
                />
                <div
                  v-if="outcomeOpen || !['run', 'sack'].includes(draft.kind)"
                  class="fieldline-outcomes"
                >
                  <div v-if="resultOptions.length" class="result-options">
                    <button
                      v-for="option in resultOptions"
                      :key="option[0]"
                      :class="{ selected: draft.result === option[0] }"
                      :aria-pressed="draft.result === option[0]"
                      @click="draft.result = option[0] as PlayInput['result']"
                    >
                      <Check v-if="draft.result === option[0]" :size="14" />{{
                        option[1]
                      }}
                    </button>
                  </div>
                  <div
                    v-if="draft.kind !== 'pass'"
                    class="input-section fieldline-direction"
                  >
                    <label>Richtung</label>
                    <div class="segmented direction">
                      <button
                        v-for="direction in ['Links', 'Mitte', 'Rechts']"
                        :key="direction"
                        :class="{ selected: draft.direction === direction }"
                        :aria-pressed="draft.direction === direction"
                        @click="draft.direction = direction"
                      >
                        {{ direction }}
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="draft.kind === 'penalty'" class="penalty-options">
                  <label
                    >Auswirkung auf den Down<select v-model="draft.penaltyMode">
                      <option value="repeat">Down wiederholen · No Play</option>
                      <option value="first">Automatisches First Down</option>
                      <option value="loss">Loss of Down</option>
                    </select></label
                  >
                  <p>
                    Standard: angenommene Strafe ohne Play. Weitere
                    Entscheidungen unter „Ruling“.
                  </p>
                </div>
                <div v-if="showReturn" class="input-section return-input">
                  <label>BALLSPOT · EIGENE GOALLINE DES TEAMS MIT BALL</label
                  ><input
                    v-model.number="draft.returnSpot"
                    @input="draft.kickSpotOverride = true"
                    type="number"
                    min="1"
                    :max="
                      draft.result === 'blocked' &&
                      draft.recoveryTeam === state.possession
                        ? 100
                        : 99
                    "
                    aria-label="Ballspot nach Ballbesitzwechsel"
                  /><small
                    >25 = eigene 25 · 75 = gegnerische 25. Return-Yards unter
                    „Ruling“ zuordnen.</small
                  >
                </div>
                <div
                  v-if="draft.result === 'faircatch'"
                  class="return-input input-section"
                >
                  <label
                    >Catch-Spot · eigene Goalline<input
                      v-model.number="draft.fairCatchSpot"
                      type="number"
                      min="0"
                      max="99"
                  /></label>
                </div>
                <div
                  v-if="['onside', 'blocked', 'muff'].includes(draft.result)"
                  class="ruling-grid return-input"
                >
                  <label
                    >Recovery<select v-model="draft.recoveryTeam">
                      <option :value="undefined">Empfänger</option>
                      <option value="home">{{ club.short }}</option>
                      <option value="away">{{ club.opponentShort }}</option>
                    </select></label
                  >
                  <label v-if="draft.result === 'blocked'"
                    >Block durch<select v-model="draft.blockedBy">
                      <option value="">Offen</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  >
                </div>
                <PlayRuling
                  v-if="rulesOpen"
                  :draft="draft"
                  :state="state"
                  :roster="roster"
                  :home="club.short"
                  :away="club.opponentShort"
                />
                <div v-if="advanced" class="advanced-grid">
                  <div class="hold-control">
                    <button
                      :class="{ holding: holdStart !== null }"
                      @pointerdown.prevent="
                        ($event.currentTarget as HTMLElement).setPointerCapture(
                          $event.pointerId,
                        );
                        beginHold();
                      "
                      @pointerup="finishHold()"
                      @pointercancel="finishHold(true)"
                      @keydown.space.prevent="beginHold()"
                      @keyup.space.prevent="finishHold()"
                    >
                      <Timer :size="20" />
                      {{
                        holdStart !== null
                          ? heldSeconds + " s · loslassen"
                          : "Playdauer halten"
                      }}</button
                    ><small>Zeitschätzung · keine offizielle Spieluhr</small>
                  </div>
                  <label
                    >{{
                      draft.timeEstimated ? "Geschätzte" : "Verstrichene"
                    }}
                    Spielzeit (Sek.)<input
                      v-model.number="draft.elapsed"
                      type="number"
                      min="0"
                      :max="state.clock" /></label
                  ><label
                    >Tackler · {{ defenseTeam
                    }}<select v-model="draft.tackler">
                      <option value="">Noch offen</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  ><label
                    >Assist · {{ defenseTeam
                    }}<select v-model="draft.assist">
                      <option value="">Keiner</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  ><label v-if="draft.result === 'interception'"
                    >Interception durch<select v-model="draft.interceptor">
                      <option value="">Noch offen</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  ><label v-if="draft.result === 'incomplete'"
                    >Pass Breakup durch<select v-model="draft.breakup">
                      <option value="">Nicht zugeordnet</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  ><template
                    v-if="['fumble', 'fumble-kept'].includes(draft.result)"
                    ><label
                      >Forced Fumble durch<select v-model="draft.forcedBy">
                        <option value="">Noch offen</option>
                        <option
                          v-for="p in defenders"
                          :key="p.number"
                          :value="p.number"
                        >
                          #{{ p.number }} {{ p.name }}
                        </option>
                      </select></label
                    ><label
                      >Recovery durch<select v-model="draft.recoveredBy">
                        <option value="">Noch offen</option>
                        <option
                          v-for="p in draft.result === 'fumble'
                            ? defenders
                            : offensePlayers"
                          :key="p.number"
                          :value="p.number"
                        >
                          #{{ p.number }} {{ p.name }}
                        </option>
                      </select></label
                    ></template
                  ><label v-if="draft.kind === 'pass'"
                    >Air Yards<input
                      v-model.number="draft.airYards"
                      type="number" /></label
                  ><label
                    >QB Hurry<select v-model="draft.hurry">
                      <option value="">Keiner</option>
                      <option
                        v-for="p in defenders"
                        :key="p.number"
                        :value="p.number"
                      >
                        #{{ p.number }} {{ p.name }}
                      </option>
                    </select></label
                  ><label class="note-input"
                    >Notiz<input
                      v-model="draft.note"
                      placeholder="z. B. Playcall, Coverage oder Strafe"
                      maxlength="200"
                  /></label>
                </div>
                <p v-if="error" role="alert" class="error-message">
                  {{ error }}
                </p>
                <div class="save-play-row">
                  <div>
                    <span class="auto-label">Danach</span
                    ><strong>{{ previewLabel }}</strong>
                  </div>
                  <button
                    class="button primary save-play"
                    :disabled="state.ended"
                    @click="savePlay"
                  >
                    Speichern
                    <ArrowRight :size="18" />
                  </button>
                </div>
              </section>
            </div>
            <aside class="insights-column">
              <section class="panel live-stats">
                <div class="panel-heading">
                  <h2>Live Insights</h2>
                  <span class="live-badge"
                    ><span class="tiny-dot"></span> LIVE</span
                  >
                </div>
                <div class="stats-caption">
                  {{ activeTeam }}
                  <span>{{
                    state.possession === "home"
                      ? "OFFENSE"
                      : "GEGNER · DEFENSE-VIEW"
                  }}</span>
                </div>
                <div class="hero-stat">
                  <strong>{{ liveStats.yards }}</strong
                  ><span
                    >{{
                      state.possession === "home"
                        ? "Total Yards"
                        : "Yards zugelassen"
                    }}<small>{{ liveStats.plays }} erfasste Plays</small></span
                  ><TrendingUp :size="30" :stroke-width="1.4" />
                </div>
                <div class="split-stats">
                  <div>
                    <span>Passing</span
                    ><strong
                      >{{ liveStats.passYards }}<small>YDS</small></strong
                    >
                  </div>
                  <div>
                    <span>Rushing</span
                    ><strong
                      >{{ liveStats.rushYards }}<small>YDS</small></strong
                    >
                  </div>
                </div>
                <div class="stat-meter">
                  <div>
                    <span>3rd Down</span
                    ><strong
                      >{{ liveStats.thirdMade }}/{{ liveStats.thirdAttempts }}
                      <small
                        >{{
                          liveStats.thirdAttempts
                            ? Math.round(
                                (liveStats.thirdMade /
                                  liveStats.thirdAttempts) *
                                  100,
                              )
                            : 0
                        }}%</small
                      ></strong
                    >
                  </div>
                  <div class="meter-track">
                    <div
                      :style="{
                        width: `${liveStats.thirdAttempts ? (liveStats.thirdMade / liveStats.thirdAttempts) * 100 : 0}%`,
                      }"
                    ></div>
                  </div>
                </div>
                <div class="stat-meter">
                  <div>
                    <span
                      >{{
                        state.possession === "home"
                          ? "Success Rate"
                          : "Stop Rate"
                      }}
                      <button
                        aria-label="Success Rate erklären"
                        @click="drawer = 'help'"
                      >
                        <CircleHelp :size="13" /></button></span
                    ><strong
                      >{{
                        liveStats.plays
                          ? state.possession === "home"
                            ? liveStats.success
                            : 100 - liveStats.success
                          : "—"
                      }}<small>%</small></strong
                    >
                  </div>
                  <div class="meter-track">
                    <div
                      :style="{
                        width: `${liveStats.plays ? (state.possession === 'home' ? liveStats.success : 100 - liveStats.success) : 0}%`,
                      }"
                    ></div>
                  </div>
                </div>
                <div class="insight-bottom">
                  <span><Zap :size="16" /> Explosive Plays</span
                  ><strong>{{ liveStats.explosive }}</strong>
                </div>
                <button
                  class="full-width-button"
                  @click="navigate('dashboard')"
                >
                  Analyse <ArrowUpRight :size="17" />
                </button>
              </section>
              <section class="panel recent-panel">
                <div class="panel-heading">
                  <h2>Letzte Spielzüge</h2>
                  <span class="count-badge">{{ plays.length }}</span>
                </div>
                <div v-if="!plays.length" class="empty-state">
                  Dein erster Spielzug startet hier.
                </div>
                <div
                  v-for="p in [...plays].reverse().slice(0, 4)"
                  :key="p.id"
                  class="recent-play"
                >
                  <div class="recent-type" :class="{ pass: p.kind === 'pass' }">
                    <ArrowUpRight
                      v-if="p.kind === 'pass'"
                      :size="19"
                    /><ArrowRight v-else :size="19" />
                  </div>
                  <div>
                    <strong
                      >{{ labels[p.kind] }}
                      <span v-if="p.firstDown" class="first-down-tag"
                        >1ST</span
                      ></strong
                    >
                    <p>{{ playDescription(p) }}</p>
                    <small
                      >{{
                        p.before.overtime
                          ? `OT${p.before.overtime.round}`
                          : `Q${p.before.quarter}`
                      }}
                      · {{ clockLabel(p.before.clock) }} ·
                      {{
                        p.before.possession === "home"
                          ? club.short
                          : club.opponentShort
                      }}</small
                    >
                  </div>
                  <b :class="{ negative: p.yards < 0 }"
                    >{{ p.yards > 0 ? "+" : "" }}{{ p.yards
                    }}<small>YDS</small></b
                  >
                </div>
                <button class="full-width-button" @click="navigate('history')">
                  Alle Spielzüge <ArrowRight :size="17" />
                </button>
              </section>
              <div class="sideline-note">
                <Shield :size="20" />
                <div>
                  <strong>Auch ohne Netz am Ball.</strong>
                  <p>
                    Erfasste Plays bleiben auf diesem Gerät gespeichert.
                    Regelmäßig exportieren.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </template>

        <template v-else-if="page === 'dashboard'">
          <div class="dashboard-toolbar">
            <div class="segmented">
              <button
                :class="{ selected: analysisSide === 'offense' }"
                :aria-pressed="analysisSide === 'offense'"
                @click="analysisSide = 'offense'"
              >
                Offense</button
              ><button
                :class="{ selected: analysisSide === 'defense' }"
                :aria-pressed="analysisSide === 'defense'"
                @click="analysisSide = 'defense'"
              >
                Defense
              </button>
            </div>
            <div class="segmented half-toggle">
              <button
                v-for="option in [
                  { id: 'all', label: 'Gesamt' },
                  { id: 'first', label: '1. Halbzeit' },
                  { id: 'second', label: '2. Halbzeit' },
                  { id: 'ot', label: 'OT' },
                ] as const"
                :key="option.id"
                :class="{ selected: half === option.id }"
                :aria-pressed="half === option.id"
                @click="half = option.id"
              >
                {{ option.label }}
              </button>
            </div>
            <span>{{ analysisPlays.length }} Ereignisse</span>
          </div>
          <div class="metric-grid">
            <section
              v-for="m in [
                {
                  name:
                    analysisSide === 'offense'
                      ? 'Total Offense'
                      : 'Yards zugelassen',
                  value: selectedStats.yards,
                  suffix: 'YDS',
                  detail: `${selectedStats.plays} Plays · ${selectedStats.ypp} Yds / Play`,
                },
                {
                  name: 'Pass Completions',
                  value: `${selectedStats.completions}/${selectedStats.attempts}`,
                  suffix: '',
                  detail: `${selectedStats.passYards} Passing Yards`,
                },
                {
                  name:
                    analysisSide === 'offense' ? 'Success Rate' : 'Stop Rate',
                  value: selectedStats.plays
                    ? analysisSide === 'offense'
                      ? selectedStats.success
                      : 100 - selectedStats.success
                    : '—',
                  suffix: '%',
                  detail: 'Coaching-Metrik · 50 / 70 / 100 %',
                },
                {
                  name: 'Explosive Plays',
                  value: selectedStats.explosive,
                  suffix: '',
                  detail: 'Run ≥ 10 · Pass ≥ 20 Yards',
                },
              ]"
              :key="m.name"
              class="panel metric"
            >
              <span>{{ m.name }}</span
              ><strong
                >{{ m.value }}<small>{{ m.suffix }}</small></strong
              >
              <p>{{ m.detail }}</p>
            </section>
          </div>
          <div class="dashboard-columns">
            <section class="panel comparison-panel">
              <div class="panel-heading">
                <h2>Teamvergleich</h2>
                <span class="neutral-badge">{{ periodLabel }}</span>
              </div>
              <div class="comparison-teams">
                <strong>{{ club.short }}</strong
                ><span>{{ club.opponentShort }}</span>
              </div>
              <div
                v-for="row in comparison"
                :key="row.label"
                class="comparison-row"
              >
                <div>
                  <strong>{{ row.home }}</strong
                  ><span>{{ row.label }}</span
                  ><strong>{{ row.away }}</strong>
                </div>
                <div class="comparison-bars">
                  <i
                    :style="{
                      width: `${(Math.max(0, row.home) / Math.max(1, Math.max(0, row.home) + Math.max(0, row.away))) * 100}%`,
                    }"
                  ></i
                  ><i></i>
                </div>
              </div>
            </section>
            <section class="panel efficiency-panel">
              <div class="panel-heading">
                <h2>Situational Football</h2>
                <Target :size="19" />
              </div>
              <div
                v-for="item in [
                  {
                    name: '3rd Down Conversions',
                    value: `${selectedStats.thirdMade} / ${selectedStats.thirdAttempts}`,
                  },
                  {
                    name: '4th Down Conversions',
                    value: `${selectedStats.fourthMade} / ${selectedStats.fourthAttempts}`,
                  },
                  {
                    name: 'Red Zone Scoring',
                    value: `${selectedStats.redzoneScored} / ${selectedStats.redzone}`,
                  },
                  { name: 'Turnovers', value: selectedStats.turnovers },
                  {
                    name: 'Strafen / Yards',
                    value: `${selectedStats.penaltyCount} / ${selectedStats.penaltyYards}`,
                  },
                  { name: 'NCAA Pass Efficiency', value: selectedStats.rating },
                  {
                    name: 'Erfasste Possession-Zeit',
                    value: clockLabel(selectedStats.possession),
                  },
                  {
                    name: 'Field Goals',
                    value: `${advancedStats.fieldGoalsMade} / ${advancedStats.fieldGoals}`,
                  },
                  {
                    name: 'Punts / Brutto-Yards',
                    value: `${advancedStats.punts} / ${advancedStats.puntYards}`,
                  },
                ]"
                :key="item.name"
                class="efficiency-row"
              >
                <span>{{ item.name }}</span
                ><strong>{{ item.value }}</strong>
              </div>
            </section>
          </div>
          <section class="panel special-teams">
            <h2>Special Teams & Returns</h2>
            <div class="ruling-grid">
              <div
                v-for="item in [
                  [
                    'Punts / Yards',
                    `${selectedStats.punts} / ${selectedStats.puntYards}`,
                  ],
                  ['Netto / Punt', selectedStats.puntNet],
                  ['Inside 20', selectedStats.inside20],
                  ['Touchbacks', selectedStats.touchbacks],
                  ['Punt Return Yds', selectedStats.puntReturnYards],
                  ['Kick Return Yds', selectedStats.kickReturnYards],
                  ['INT Return Yds', selectedStats.intReturnYards],
                  ['Fumble Return Yds', selectedStats.fumbleReturnYards],
                  ['Return TD', selectedStats.returnTD],
                ]"
                :key="item[0]"
              >
                <span>{{ item[0] }}</span
                ><strong>{{ item[1] }}</strong>
              </div>
            </div>
          </section>
          <section v-if="returnCredits.length" class="panel special-teams">
            <h2>Returner</h2>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Spieler</th>
                    <th>Typ</th>
                    <th>RET</th>
                    <th>YDS</th>
                    <th>TD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in returnCredits" :key="i">
                    <td>
                      {{ r.team === "home" ? club.short : club.opponentShort }}
                      · #{{ r.player || "?" }}
                      {{ playerName(r.player, r.team) }}
                    </td>
                    <td>{{ r.kind }}</td>
                    <td>{{ r.attempts }}</td>
                    <td>{{ r.yards }}</td>
                    <td>{{ r.td }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel halftime-panel">
            <div class="panel-heading">
              <h2>Halftime Adjustments</h2>
              <span class="neutral-badge">BEIDE HALBZEITEN IM VERGLEICH</span>
            </div>
            <div class="halftime-grid">
              <div v-for="entry in halftimeComparison" :key="entry.half">
                <span>{{
                  entry.half === "first" ? "1. Halbzeit" : "2. Halbzeit"
                }}</span
                ><strong
                  >{{ entry.stats.plays ? entry.stats.ypp : "—" }}
                  <small>{{
                    analysisSide === "offense"
                      ? "Yds / Play"
                      : "Yds zugelassen / Play"
                  }}</small></strong
                >
                <p>
                  {{ entry.stats.plays }} Plays ·
                  {{
                    entry.stats.plays
                      ? (analysisSide === "offense"
                          ? entry.stats.success
                          : 100 - entry.stats.success) + " %"
                      : "—"
                  }}
                  {{ analysisSide === "offense" ? "Success" : "Stops" }}
                </p>
              </div>
            </div>
          </section>
          <section class="panel breakdown-panel">
            <div class="panel-heading">
              <h2>Playcall-Analyse</h2>
              <span class="neutral-badge">{{ periodLabel }}</span>
            </div>
            <div class="breakdown-controls">
              <label
                >Auswerten nach<select v-model="analysisCategory">
                  <option value="formation">Formation</option>
                  <option value="concept">Konzept</option>
                  <option value="personnel">Personnel</option>
                  <option value="coverage">Coverage</option>
                  <option value="blitz">Blitz</option>
                  <option value="alignment">Alignment</option>
                  <option value="stunt">Stunt</option>
                  <option value="motion">Motion</option>
                  <option value="tag">Tag</option>
                </select></label
              ><label
                >Begriff auswählen<select v-model="analysisTerm">
                  <option value="all">Alle Begriffe</option>
                  <option v-for="term in breakdownOptions" :key="term">
                    {{ term }}
                  </option>
                </select></label
              ><label
                >Down<select v-model="analysisDown">
                  <option value="all">Alle Downs</option>
                  <option v-for="d in 4" :key="d" :value="String(d)">
                    {{ d }}. Down
                  </option>
                </select></label
              ><label
                >Distanz<select v-model="analysisDistance">
                  <option value="all">Alle Distanzen</option>
                  <option value="short">Short · 1–3 Yds</option>
                  <option value="medium">Medium · 4–6 Yds</option>
                  <option value="long">Long · 7+ Yds</option>
                </select></label
              >
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>CALL</th>
                    <th>PLAYS</th>
                    <th>YDS / PLAY</th>
                    <th>RUN %</th>
                    <th>YDS / RUN</th>
                    <th>YDS / PASS</th>
                    <th>SUCCESS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in breakdownRows" :key="row.name">
                    <td>{{ row.name }}</td>
                    <td>{{ row.plays }}</td>
                    <td>{{ row.ypp }}</td>
                    <td>{{ row.run }} %</td>
                    <td>{{ row.runYpp }}</td>
                    <td>{{ row.passYpp }}</td>
                    <td>
                      <div class="breakdown-success">
                        {{ row.success }} %
                        <div class="meter-track">
                          <div :style="{ width: row.success + '%' }"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!breakdownRows.length" class="empty-state">
                Für diesen Abschnitt sind noch keine Plays erfasst.
              </div>
            </div>
          </section>
          <section class="panel tendencies-panel">
            <div class="panel-heading">
              <h2>Richtung & Passing-Details</h2>
              <span class="neutral-badge">COACHING</span>
            </div>
            <div class="tendency-grid">
              <div v-for="row in tendencies" :key="row.direction">
                <span>{{ row.direction }}</span
                ><strong>{{ row.yards }} <small>Yds</small></strong>
                <p>{{ row.count }} Plays · {{ row.success }} % Success</p>
                <div class="meter-track">
                  <div :style="{ width: `${row.success}%` }"></div>
                </div>
              </div>
              <div>
                <span>Air Yards / YAC</span
                ><strong
                  >{{ advancedStats.airYards }} <small>/</small>
                  {{ advancedStats.yac }}</strong
                >
                <p>{{ advancedStats.airPlays }} vollständige Pass-Tags</p>
              </div>
            </div>
          </section>
          <section
            v-if="analysisSide === 'defense'"
            class="panel defense-credits"
          >
            <div class="panel-heading">
              <h2>Defense Credits · {{ club.short }}</h2>
              <span class="neutral-badge">{{ periodLabel }}</span>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>SPIELER</th>
                    <th>SOLO</th>
                    <th>ASSISTS</th>
                    <th>SACKS</th>
                    <th>TFL</th>
                    <th>INT</th>
                    <th>FF</th>
                    <th>FR</th>
                    <th>PBU</th>
                    <th>HURRY</th>
                    <th>BLOCK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in defenseCredits" :key="p.number">
                    <td>#{{ p.number }} {{ p.name }}</td>
                    <td>{{ p.solo }}</td>
                    <td>{{ p.assists }}</td>
                    <td>{{ p.sacks }}</td>
                    <td>{{ p.tfl }}</td>
                    <td>{{ p.interceptions }}</td>
                    <td>{{ p.forced }}</td>
                    <td>{{ p.recoveries }}</td>
                    <td>{{ p.breakups }}</td>
                    <td>{{ p.hurries }}</td>
                    <td>{{ p.blocks }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel">
            <div class="panel-heading">
              <h2>
                Player Box Score
                <span class="neutral-badge">{{
                  statsTeam === "home" ? club.short : club.opponentShort
                }}</span>
              </h2>
              <button class="subtle-button" @click="exportFile('csv')">
                <ArrowDownToLine :size="16" /> CSV
              </button>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Spieler</th>
                    <th>POS</th>
                    <th>PASS C/A</th>
                    <th>PASS YDS</th>
                    <th>RUSH ATT</th>
                    <th>RUSH YDS</th>
                    <th>REC</th>
                    <th>REC YDS</th>
                    <th>SOLO / AST</th>
                    <th>SACKS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in playerStats" :key="p.number">
                    <td>
                      <b class="jersey-inline">{{ p.number }}</b
                      >{{ p.name }}
                    </td>
                    <td>{{ p.position }}</td>
                    <td>{{ p.completions }}/{{ p.attempts }}</td>
                    <td>{{ p.passYards }}</td>
                    <td>{{ p.rushAtt }}</td>
                    <td>{{ p.rushYards }}</td>
                    <td>{{ p.receptions }}</td>
                    <td>{{ p.recYards }}</td>
                    <td>{{ p.tackles }} / {{ p.assists }}</td>
                    <td>{{ p.sacks }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="table-note">
              Team-Kneels und Spikes fließen ausschließlich in Teamwerte ein.
              Unbekannte Spieler bleiben bis zur Zuordnung offen.
            </p>
          </section>
        </template>

        <template v-else-if="page === 'history'"
          ><section class="panel history-panel">
            <div class="panel-heading">
              <h2>
                Play-by-Play <span class="count-badge">{{ plays.length }}</span>
              </h2>
              <button
                class="button light"
                :disabled="!plays.length"
                @click="undoPlay"
              >
                <RotateCcw :size="16" /> Zurücknehmen
              </button>
            </div>
            <div class="history-filters">
              <button
                v-for="f in [
                  { id: 'all', name: 'Alle' },
                  { id: 'home', name: club.short },
                  { id: 'away', name: club.opponentShort },
                  { id: 'scoring', name: 'Scores' },
                ]"
                :key="f.id"
                :class="{ selected: historyFilter === f.id }"
                :aria-pressed="historyFilter === f.id"
                @click="historyFilter = f.id"
              >
                {{ f.name }}
              </button>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Q / ZEIT</th>
                    <th>TEAM</th>
                    <th>SITUATION</th>
                    <th>SPIELZUG</th>
                    <th>YARDS</th>
                    <th>ERGEBNIS</th>
                    <th>REVIEW</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in filteredPlays" :key="p.id">
                    <td>
                      {{
                        p.before.overtime
                          ? `OT${p.before.overtime.round}`
                          : `Q${p.before.quarter}`
                      }}
                      <strong>{{ clockLabel(p.before.clock) }}</strong>
                    </td>
                    <td>
                      {{
                        p.before.possession === "home"
                          ? club.short
                          : club.opponentShort
                      }}
                    </td>
                    <td>
                      {{ p.before.down }}. & {{ p.before.distance
                      }}<small class="table-secondary">{{
                        spotLabel(p.before.ball)
                      }}</small>
                    </td>
                    <td>
                      <strong>{{ labels[p.kind] }}</strong
                      ><small class="table-secondary">{{
                        playDescription(p)
                      }}</small
                      ><small v-if="p.note" class="table-secondary">{{
                        p.note
                      }}</small>
                    </td>
                    <td class="yard-cell">
                      {{ p.yards > 0 ? "+" : "" }}{{ p.yards }}
                    </td>
                    <td>
                      <span
                        :class="{
                          'outcome-tag':
                            p.touchdown || p.firstDown || p.turnover,
                        }"
                        >{{
                          p.touchdown
                            ? "Touchdown"
                            : p.safety
                              ? "Safety"
                              : p.turnover
                                ? "Turnover"
                                : p.firstDown
                                  ? "First Down"
                                  : p.result === "incomplete"
                                    ? "Incomplete"
                                    : "—"
                        }}</span
                      >
                    </td>
                    <td>
                      <button
                        class="button light"
                        @click="
                          reviewing = p;
                          reviewError = '';
                        "
                      >
                        Prüfen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!filteredPlays.length" class="empty-state">
                Keine Spielzüge für diesen Filter.
              </div>
            </div>
          </section></template
        >
        <template v-else-if="page === 'roster'"
          ><section class="panel roster-panel">
            <div class="panel-heading">
              <h2>Gameday Roster</h2>
              <button
                class="button primary"
                @click="
                  rosterError = '';
                  editingPlayer = null;
                  Object.assign(newPlayer, {
                    number: '',
                    name: '',
                    position: 'WR',
                    team: 'home',
                  });
                  showPlayerForm = !showPlayerForm;
                "
              >
                <Plus :size="18" /> Spieler
              </button>
            </div>
            <div v-if="showPlayerForm" class="player-form">
              <label
                >Nummer<input
                  v-model="newPlayer.number"
                  :disabled="!!editingPlayer"
                  inputmode="numeric"
                  maxlength="2" /></label
              ><label
                >Name<input v-model="newPlayer.name" maxlength="60" /></label
              ><label
                >Position<select v-model="newPlayer.position">
                  <option
                    v-for="pos in [
                      'QB',
                      'RB',
                      'WR',
                      'TE',
                      'OL',
                      'DL',
                      'LB',
                      'CB',
                      'S',
                      'K',
                      'P',
                    ]"
                    :key="pos"
                  >
                    {{ pos }}
                  </option>
                </select></label
              ><label
                >Team<select
                  v-model="newPlayer.team"
                  :disabled="!!editingPlayer"
                >
                  <option value="home">{{ club.short }}</option>
                  <option value="away">{{ club.opponentShort }}</option>
                </select></label
              ><button class="button primary" @click="addPlayer">
                Speichern
              </button>
              <button
                class="button light"
                @click="
                  showPlayerForm = false;
                  rosterError = '';
                "
              >
                Abbrechen
              </button>
            </div>
            <p
              v-if="rosterError && showPlayerForm"
              class="error-message"
              role="alert"
            >
              {{ rosterError }}
            </p>
            <div class="roster-teams">
              <div v-for="team in ['home', 'away'] as const" :key="team">
                <h3>
                  {{ team === "home" ? club.name : club.opponent }}
                  <span
                    >{{
                      roster.filter((p) => p.team === team).length
                    }}
                    Spieler</span
                  >
                </h3>
                <div
                  v-if="!roster.some((p) => p.team === team)"
                  class="empty-state"
                >
                  Noch keine Spieler. Über „Spieler“ den Kader ergänzen.
                </div>
                <div
                  v-for="p in roster.filter((p) => p.team === team)"
                  :key="p.number"
                  class="roster-player"
                >
                  <span class="jersey">{{ p.number }}</span>
                  <div>
                    <strong>{{ p.name }}</strong
                    ><small>{{ p.position }}</small>
                  </div>
                  <button
                    class="icon-button"
                    :aria-label="p.name + ' bearbeiten'"
                    @click="editPlayer(p)"
                  >
                    <Pencil :size="16" />
                  </button>
                </div>
              </div>
            </div></section
        ></template>
        <footer class="workspace-footer">
          <span
            ><span class="footer-mark">MIDFIELD</span>
            <span class="muted-dot">/</span> Every play counts.</span
          ><span>Auf diesem Gerät gespeichert · Ohne Cloud</span>
        </footer>
      </main>
    </div>
    <Transition name="toast"
      ><div v-if="toast" class="toast-message" role="status">
        <Check :size="18" />{{ toast }}
      </div></Transition
    >
    <div
      v-if="drawer"
      class="drawer-backdrop"
      @click.self="drawer = null"
      @keydown.esc="drawer = null"
    >
      <section
        ref="drawerElement"
        class="drawer"
        @keydown="trapFocus"
        role="dialog"
        aria-modal="true"
        :aria-label="
          drawer === 'settings'
            ? 'Club Einstellungen'
            : drawer === 'help'
              ? 'Kurzanleitung'
              : 'Spielzeit'
        "
        tabindex="-1"
      >
        <div class="drawer-heading">
          <h2>
            {{
              drawer === "settings"
                ? "Dein Club. Deine Farben."
                : drawer === "help"
                  ? "Schneller am nächsten Play."
                  : "Spielzeit & Quarter"
            }}
          </h2>
          <button
            class="icon-button"
            aria-label="Schließen"
            @click="drawer = null"
          >
            <X :size="22" />
          </button>
        </div>
        <template v-if="drawer === 'settings'"
          ><p>
            Ein Workspace in euren drei Hauptfarben. Änderungen werden sofort
            auf diesem Gerät gespeichert.
          </p>
          <label class="logo-upload"
            >Clublogo (JPEG/PNG, max. 2 MB)<input
              type="file"
              accept="image/jpeg,image/png"
              @change="uploadLogo" /><img
              v-if="club.logo"
              :src="club.logo"
              alt="Aktuelles Clublogo" /></label
          ><button
            v-if="club.logo"
            class="button light"
            @click="club.logo = ''"
          >
            Logo entfernen</button
          ><label>Clubname<input v-model="club.name" maxlength="40" /></label
          ><label>Kürzel<input v-model="club.short" maxlength="4" /></label>
          <section class="drawer-section">
            <h3>Auf dem Tablet</h3>
            <p>
              {{ offline.label.value }}. Einmal online laden, bis „Offline
              bereit“ erscheint. Safari: Teilen → Zum Home-Bildschirm. Chrome:
              Menü → App installieren.
            </p>
            <p>
              Updates werden erst nach Schließen aller App-Fenster aktiv.
              Alternativ hier laden; der Entwurf bleibt erhalten.
            </p>
            <button class="button light" @click="drawer = 'help'">
              <CircleHelp :size="17" /> Anleitung
            </button>
            <button
              v-if="offline.update.value"
              class="button primary"
              :disabled="offline.busy.value"
              @click="offline.activate"
            >
              Update laden
            </button>
          </section>
          <div class="color-settings">
            <label
              v-for="color in [
                {
                  key: 'primary',
                  name: 'Primär',
                  description: 'Marke & Navigation',
                },
                {
                  key: 'secondary',
                  name: 'Sekundär',
                  description: 'Aktionen & Highlights',
                },
                {
                  key: 'accent',
                  name: 'Akzent',
                  description: 'Flächen & Kacheln',
                },
              ] as const"
              :key="color.key"
              ><input
                v-model="club[color.key]"
                type="color"
                :aria-label="color.name + 'farbe'" /><strong>{{
                color.name
              }}</strong
              ><span>{{ color.description }}</span
              ><input
                class="hex-input"
                :value="club[color.key]"
                :aria-label="color.name + 'farbe als Hexcode'"
                maxlength="7"
                @change="setHex(color.key, $event)"
            /></label>
          </div>
          <span class="eyebrow preset-label">FARBVORLAGEN</span>
          <div class="theme-presets">
            <button
              @click="
                club.primary = '#193c32';
                club.secondary = '#dbf479';
                club.accent = '#f4f2eb';
              "
            >
              <i style="background: #193c32"></i
              ><i style="background: #dbf479"></i> MIDFIELD</button
            ><button
              @click="
                club.primary = '#801f2b';
                club.secondary = '#f3c569';
                club.accent = '#f6efeb';
              "
            >
              <i style="background: #801f2b"></i
              ><i style="background: #f3c569"></i> Red zone</button
            ><button
              @click="
                club.primary = '#16365d';
                club.secondary = '#8ed9f2';
                club.accent = '#eef2f6';
              "
            >
              <i style="background: #16365d"></i
              ><i style="background: #8ed9f2"></i> Away blue
            </button>
          </div>
          <label>Gegner<input v-model="club.opponent" maxlength="40" /></label
          ><label
            >Gegner-Kürzel<input v-model="club.opponentShort" maxlength="4"
          /></label>
          <div class="drawer-section">
            <h3>Spielregeln</h3>
            <label
              >Quarterlänge<select v-model.number="settings.quarterMinutes">
                <option :value="8">8 Minuten</option>
                <option :value="10">10 Minuten</option>
                <option :value="12">12 Minuten</option>
                <option :value="15">15 Minuten (NCAA)</option>
              </select></label
            ><label
              >Play-Clock-Vorgabe<select v-model.number="settings.playClock">
                <option :value="25">25 Sekunden</option>
                <option :value="40">40 Sekunden</option>
              </select></label
            >
            <p>
              Quarterlänge gilt ab dem nächsten Quarter oder neuen Spiel. Die
              Play Clock ist eine Vorgabe, kein automatisch laufender Timer.
            </p>
          </div>
          <div class="drawer-section">
            <h3>Spiel sichern</h3>
            <p>
              CSV für die Analyse, JSON als vollständige Sicherung. Die
              Speicherung ist lokal; ein weiterer Tab desselben Browsers erhält
              Änderungen live.
            </p>
            <div class="drawer-actions">
              <button class="button light" @click="exportFile('csv')">
                <ArrowDownToLine :size="17" /> CSV</button
              ><button class="button light" @click="exportFile('json')">
                Sicherung
              </button>
            </div>
          </div>
          <div class="drawer-section backup-section">
            <h3>Sicherung laden</h3>
            <p>
              JSON-Datei prüfen und anschließend übernehmen. Der aktuelle Stand
              bleibt als vorherige Sicherung auf diesem Gerät.
            </p>
            <input
              ref="importInput"
              class="visually-hidden"
              type="file"
              accept=".json,application/json"
              aria-label="MIDFIELD-Sicherung auswählen"
              @change="readBackup"
            />
            <button class="button light" @click="importInput?.click()">
              <ArrowDownToLine :size="17" />Datei wählen
            </button>
            <p v-if="backupError" role="alert" class="error-message">
              {{ backupError }}
            </p>
            <div v-if="backupPreview" class="backup-preview">
              <strong
                >{{ backupPreview.club.short }} vs.
                {{ backupPreview.club.opponentShort }}</strong
              >
              <p>
                {{ backupPreview.plays.length }} Plays ·
                {{ backupPreview.roster.length }} Spieler{{
                  backupPreview.isDemo ? " · Demo" : ""
                }}
              </p>
              <small>{{ backupFile }}</small>
              <p>
                Ersetzt das aktuelle Spiel, Kader, Playbook und
                Club-Einstellungen.
              </p>
              <div class="drawer-actions">
                <button class="button primary" @click="restoreBackup">
                  Übernehmen</button
                ><button
                  class="button light"
                  @click="
                    backupPreview = null;
                    backupText = '';
                  "
                >
                  Abbrechen
                </button>
              </div>
            </div>
            <button
              v-if="game.previousBackup.value"
              class="button light recovery-download"
              @click="
                downloadText(
                  game.previousBackup.value!,
                  'midfield-vorheriger-stand.json',
                )
              "
            >
              Vorherigen Stand sichern
            </button>
            <button
              v-if="game.recoveryData.value"
              class="button light recovery-download"
              @click="
                downloadText(
                  game.recoveryData.value!,
                  'midfield-originaldaten.json',
                )
              "
            >
              Originaldaten sichern
            </button>
          </div>
          <div class="drawer-section">
            <h3>Demospiel</h3>
            <p>
              Beispielspiel mit vorbereiteten Plays für Training und
              Präsentationen. Der aktuelle Stand wird zuvor lokal gesichert.
            </p>
            <button
              v-if="!demoConfirm"
              class="button light"
              @click="demoConfirm = true"
            >
              Demo laden
            </button>
            <div v-else class="backup-preview">
              <p>Das aktuelle Spiel durch Beispieldaten ersetzen?</p>
              <div class="drawer-actions">
                <button class="button primary" @click="newMatch(true)">
                  Demo starten</button
                ><button class="button light" @click="demoConfirm = false">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
          <div class="drawer-section">
            <h3>Neues Spiel</h3>
            <p>
              Start bei 0:0 · 1. Quarter · eigene 25. Club und Kader bleiben
              erhalten.
            </p>
            <button
              v-if="!resetConfirm"
              class="button light"
              @click="resetConfirm = true"
            >
              Neues Spiel
            </button>
            <div v-else>
              <p>Aktuelle Plays werden ersetzt. Vorher bei Bedarf Sicherung.</p>
              <div class="drawer-actions">
                <button class="button primary" @click="newMatch()">
                  Neu starten</button
                ><button class="button light" @click="resetConfirm = false">
                  Abbrechen
                </button>
              </div>
            </div>
          </div></template
        >
        <template v-else-if="drawer === 'help'"
          ><div class="help-step">
            <b>01</b>
            <div>
              <h3>Spielzug wählen</h3>
              <p>
                Lauf oder Pass, Spieler auswählen. Der Quarterback bleibt beim
                Pass vorausgewählt.
              </p>
            </div>
          </div>
          <div class="help-step">
            <b>02</b>
            <div>
              <h3>Ergebnis antippen</h3>
              <p>
                Yards über die großen Tasten oder den Endpunkt auf dem Feld
                erfassen. Incomplete, Turnover und Strafen haben eigene
                Optionen.
              </p>
            </div>
          </div>
          <div class="help-step">
            <b>03</b>
            <div>
              <h3>Speichern. Weiter geht’s.</h3>
              <p>
                Down, Distanz, Score und Auswertungen ändern sich sofort. Ein
                Touchdown führt zur Conversion, danach zum Kickoff.
              </p>
            </div>
          </div>
          <div class="drawer-section">
            <h3>Was wird automatisch berechnet?</h3>
            <p>
              Passing, Rushing, First Downs, Conversions, Red-Zone-Scoring und
              NCAA Pass Efficiency aus deinen Plays. Sacks zählen zu Rushing;
              Kneel und Spike zum Team.
            </p>
            <h3>Coaching-Metriken</h3>
            <p>
              Success Rate: mindestens 50 % der Distanz beim 1. Down, 70 % beim
              2. und 100 % beim 3./4. Down. Explosive Play: Run ≥ 10, Pass ≥ 20
              Yards. Das sind hier festgelegte Coaching-Definitionen.
            </p>
            <h3>Ehrliche Daten</h3>
            <p>
              Die Uhr läuft bewusst nicht automatisch. Erfasse die Stadionzeit
              über den Spielzeit-Button oder die verstrichenen Sekunden im Play.
              Ohne diese Eingabe ist die Possession-Zeit unvollständig.
            </p>
            <p>
              Dies ist ein lokaler Prototyp, kein offizielles
              NCAA-Scoring-System. Komplexe Strafen, Return-Statistiken,
              Overtime und geräteübergreifende Synchronisierung sind noch offen.
            </p>
          </div></template
        >
        <template v-else
          ><div class="situation-form">
            <label
              >{{ club.short }} Punkte<input
                v-model.number="situation.home"
                type="number"
                min="0" /></label
            ><label
              >{{ club.opponentShort }} Punkte<input
                v-model.number="situation.away"
                type="number"
                min="0" /></label
            ><label
              >Quarter<select
                v-model.number="situation.quarter"
                :disabled="!!state.overtime"
              >
                <option v-if="state.overtime" :value="state.quarter">
                  OT {{ state.overtime.round }}
                </option>
                <option v-for="q in 4" :key="q" :value="q">
                  Quarter {{ q }}
                </option>
              </select></label
            ><label
              >Spieluhr<input
                v-model="situationClock"
                placeholder="MM:SS" /></label
            ><label
              >Down<input
                v-model.number="situation.down"
                type="number"
                min="1"
                max="4" /></label
            ><label
              >Distanz<input
                v-model.number="situation.distance"
                type="number"
                min="1"
                :max="100 - situation.ball" /></label
            ><label
              >Ballbesitz<select v-model="situation.possession">
                <option value="home">{{ club.short }}</option>
                <option value="away">{{ club.opponentShort }}</option>
              </select></label
            ><label
              >Phase<select v-model="situation.phase">
                <option value="scrimmage">Scrimmage</option>
                <option value="try">Conversion</option>
                <option value="kickoff">Kickoff</option>
              </select></label
            ><label class="full-span"
              >Ballspot: {{ spotLabel(situation.ball)
              }}<input
                v-model.number="situation.ball"
                aria-label="Ballspot korrigieren"
                type="range"
                min="1"
                max="99"
            /></label>
          </div>
          <button class="button primary" @click="saveSituation">
            Übernehmen
          </button>
          <p class="manual-note">
            Manuelle Korrekturen werden separat protokolliert.
            Spielerstatistiken bleiben unverändert.
          </p>
          <div class="drawer-section"><h3>Zeit für den nächsten Play</h3></div>
          <p>
            Die Stadionuhr ist maßgeblich. Die Zeitdifferenz wird beim nächsten
            gespeicherten Play verbucht.
          </p>
          <label
            >Uhrzeit nach diesem Play<input
              v-model="clockInput"
              placeholder="MM:SS"
              inputmode="numeric" /></label
          ><button class="button primary" @click="setClock">Zeit setzen</button>
          <div class="drawer-section overtime-controls">
            <button
              v-if="game.canUndoControl.value"
              class="button light"
              @click="runAction(() => game.undoControl())"
            >
              Korrektur zurück
            </button>
            <h3>
              {{
                state.ended
                  ? "Final"
                  : state.overtime
                    ? `Overtime ${state.overtime.round}`
                    : "Spielkontrolle"
              }}
            </h3>
            <p v-if="state.overtime">
              {{
                state.overtime.round < 3
                  ? "Serie ab OPP 25. Ab OT2 nur 2-Point-Try."
                  : "Abwechselnd 2-Point-Trys ab OPP 3."
              }}
              Ohne Spieluhr.
            </p>
            <label v-if="state.overtime && !state.ended"
              >Nächste OT · erster Ball<select
                :value="state.overtime.nextFirst || other(state.overtime.first)"
                @change="
                  game.nextOvertimeFirst(
                    ($event.target as HTMLSelectElement).value as Team,
                  )
                "
              >
                <option value="home">{{ club.short }}</option>
                <option value="away">{{ club.opponentShort }}</option>
              </select></label
            >
            <div class="ruling-grid">
              <button
                class="button light"
                :disabled="state.ended || !(state.timeouts?.home ?? 3)"
                @click="runAction(() => game.timeout('home'))"
              >
                {{ club.short }} · TO {{ state.timeouts?.home ?? 3 }}</button
              ><button
                class="button light"
                :disabled="state.ended || !(state.timeouts?.away ?? 3)"
                @click="runAction(() => game.timeout('away'))"
              >
                {{ club.opponentShort }} · TO {{ state.timeouts?.away ?? 3 }}
              </button>
            </div>
            <template
              v-if="state.quarter === 4 && state.clock === 0 && !state.ended"
            >
              <label v-if="state.home === state.away"
                >OT · erster Ball<select v-model="otFirst">
                  <option value="home">{{ club.short }}</option>
                  <option value="away">{{ club.opponentShort }}</option>
                </select></label
              >
              <button
                v-if="state.home === state.away"
                class="button primary"
                @click="runAction(() => game.overtime(otFirst))"
              >
                OT starten
              </button>
              <button
                v-else
                class="button primary"
                @click="runAction(() => game.endGame())"
              >
                Abpfiff
              </button>
            </template>
            <p v-if="error" role="alert" class="error-message">{{ error }}</p>
          </div>
          <div
            v-if="!state.overtime && !state.ended && state.quarter < 4"
            class="drawer-section"
          >
            <h3>Quarter wechseln</h3>
            <p>
              Bei 00:00 das nächste Quarter starten. Die Spielsituation bleibt
              erhalten.
            </p>
            <button
              class="button light"
              :disabled="state.clock !== 0 || state.quarter >= 4"
              @click="advanceQuarter"
            >
              Q{{ state.quarter + 1 }} starten
            </button>
          </div></template
        >
      </section>
    </div>
  </div>
</template>

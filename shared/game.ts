export type Team = "home" | "away";
export type Kind =
  | "run"
  | "pass"
  | "sack"
  | "kneel"
  | "spike"
  | "penalty"
  | "punt"
  | "fieldgoal"
  | "pat"
  | "two"
  | "kickoff"
  | "grounding"
  | "wildsnap";
export interface Penalty {
  name: string;
  team: Team;
  status: "accepted" | "declined" | "offsetting";
  timing: "live" | "dead";
  spot: "previous" | "end" | "foul" | "kickoff";
  foulSpot: number;
  yards: number;
  halfDistance: boolean;
  mode: "repeat" | "first" | "loss" | "next";
  keepStats: boolean;
  safety: boolean;
  afterChange?: boolean;
  carryOver?: boolean;
}
export interface ReturnLeg {
  team: Team;
  player: string;
  // All spots are measured from this leg's team's own goal line.
  from: number;
  to: number;
  type:
    | "punt"
    | "kickoff"
    | "interception"
    | "fumble"
    | "fieldgoal"
    | "lateral";
  fumbled: boolean;
}
export interface Lateral {
  player: string;
  yards: number;
}
export interface PlayInput {
  kind: Kind;
  yards: number;
  result:
    | "normal"
    | "incomplete"
    | "interception"
    | "fumble"
    | "fumble-kept"
    | "good"
    | "missed"
    | "touchback"
    | "faircatch"
    | "downed"
    | "out"
    | "blocked"
    | "muff"
    | "onside"
    | "defensive-two"
    | "safety-one"
    | "offensive-safety-one"
    | "fumble-touchback";
  player: string;
  target: string;
  tackler: string;
  assist: string;
  direction: string;
  formation: string;
  airYards: number | null;
  elapsed: number;
  penaltyTeam: Team;
  penaltyMode: "repeat" | "first" | "loss";
  note: string;
  returnSpot: number;
  personnel: string;
  motion: string;
  tag: string;
  concept: string;
  alignment: string;
  coverage: string;
  coverageType: string;
  blitz: string;
  stunt: string;
  timeEstimated: boolean;
  interceptor: string;
  forcedBy: string;
  recoveredBy: string;
  breakup: string;
  hurry?: string;
  blockedBy?: string;
  recoveryTeam?: Team;
  returns?: ReturnLeg[];
  laterals?: Lateral[];
  penalties?: Penalty[];
  untimedAfter?: boolean;
  puntTeam?: boolean;
  kickSpotOverride?: boolean;
  fairCatchSpot?: number;
  creditedYards?: number | null;
}
export interface State {
  possession: Team;
  ball: number;
  down: number;
  distance: number;
  goalToGo: boolean;
  home: number;
  away: number;
  quarter: number;
  clock: number;
  phase: "scrimmage" | "try" | "kickoff";
  drive: number;
  overtime?: { round: number; first: Team; series: 1 | 2; nextFirst?: Team };
  timeouts?: Record<Team, number>;
  ended?: boolean;
  untimed?: boolean;
  freeKick?: boolean;
  pendingKickoff?: number;
}
export interface Play extends PlayInput {
  id: string;
  before: State;
  after: State;
  firstDown: boolean;
  touchdown: boolean;
  safety: boolean;
  turnover: boolean;
  success: boolean;
  explosive: boolean;
  countsStats?: boolean;
  penaltyFirstDowns?: number;
  conversionEligible?: boolean;
  scoringTeam?: Team;
  ruleset?: string;
}
export const labels: Record<Kind, string> = {
  run: "Lauf",
  pass: "Pass",
  sack: "Sack",
  kneel: "Kneel",
  spike: "Spike",
  penalty: "Strafe",
  punt: "Punt",
  fieldgoal: "Field Goal",
  pat: "Extrapunkt",
  two: "2-Point",
  kickoff: "Kickoff",
  grounding: "Grounding",
  wildsnap: "Bad Snap",
};
export const initialState = (): State => ({
  possession: "home",
  ball: 25,
  down: 1,
  distance: 10,
  goalToGo: false,
  home: 0,
  away: 0,
  quarter: 1,
  clock: 900,
  phase: "scrimmage",
  drive: 1,
  timeouts: { home: 3, away: 3 },
});
export const blankInput = (): PlayInput => ({
  kind: "run",
  yards: 0,
  result: "normal",
  player: "22",
  target: "81",
  tackler: "",
  assist: "",
  direction: "Nicht erfasst",
  formation: "Nicht erfasst",
  airYards: null,
  elapsed: 0,
  penaltyTeam: "home",
  penaltyMode: "repeat",
  note: "",
  returnSpot: 25,
  personnel: "",
  motion: "",
  tag: "",
  concept: "",
  alignment: "",
  coverage: "",
  coverageType: "",
  blitz: "",
  stunt: "",
  timeEstimated: false,
  interceptor: "",
  forcedBy: "",
  recoveredBy: "",
  breakup: "",
  hurry: "",
  blockedBy: "",
  returns: [],
  laterals: [],
  penalties: [],
  untimedAfter: false,
  fairCatchSpot: 10,
  creditedYards: null,
});
export const other = (team: Team): Team => (team === "home" ? "away" : "home");
export const clockLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
export const spotLabel = (ball: number) =>
  ball === 50
    ? "50"
    : `${ball < 50 ? "OWN" : "OPP"} ${ball < 50 ? ball : 100 - ball}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const RULESET = "NCAA · OT 2025+ · Stats Manual";
const scrimmageKinds = [
  "run",
  "pass",
  "sack",
  "kneel",
  "spike",
  "grounding",
  "wildsnap",
];
export function statisticalPlays(plays: Play[]) {
  return plays.filter((p) => p.countsStats !== false);
}
function newSeries(s: State) {
  s.down = 1;
  s.distance = Math.min(10, 100 - s.ball);
  s.goalToGo = s.ball > 90;
}
export function startOvertime(before: State, first: Team): State {
  if (
    before.quarter !== 4 ||
    before.clock !== 0 ||
    before.home !== before.away ||
    before.phase === "try" ||
    before.untimed ||
    before.overtime ||
    before.ended
  )
    throw new Error(
      "Overtime erst nach Q4 bei Gleichstand starten. Offene Conversion oder Verlängerung beenden.",
    );
  return {
    ...before,
    possession: first,
    quarter: 5,
    clock: 0,
    ball: 75,
    down: 1,
    distance: 10,
    goalToGo: false,
    phase: "scrimmage",
    drive: before.drive + 1,
    overtime: { round: 1, first, series: 1 },
    timeouts: { home: 1, away: 1 },
    freeKick: false,
    pendingKickoff: 0,
  };
}
export function takeTimeout(before: State, team: Team): State {
  const timeouts = { ...(before.timeouts || { home: 3, away: 3 }) };
  if (before.ended || timeouts[team] <= 0)
    throw new Error("Kein Timeout verfügbar.");
  timeouts[team]--;
  return { ...before, timeouts };
}
export function nextPeriod(before: State, minutes: number): State {
  if (
    before.ended ||
    before.overtime ||
    before.quarter >= 4 ||
    before.clock !== 0 ||
    before.phase === "try" ||
    before.untimed
  )
    throw new Error(
      "Offenen Spielzug beenden. Nach Q4 bei Gleichstand Overtime wählen.",
    );
  return {
    ...before,
    quarter: before.quarter + 1,
    clock: minutes * 60,
    timeouts: before.quarter === 2 ? { home: 3, away: 3 } : before.timeouts,
  };
}
function finishOT(s: State, before: State, defensiveScore: boolean) {
  const ot = before.overtime!;
  if (defensiveScore || (ot.series === 2 && s.home !== s.away)) {
    s.ended = true;
    return;
  }
  if (ot.series === 1) {
    s.overtime = { ...ot, series: 2 };
    s.possession = other(ot.first);
  } else {
    s.overtime = {
      round: ot.round + 1,
      first: ot.nextFirst || other(ot.first),
      series: 1,
    };
    s.possession = s.overtime.first;
    if (s.overtime.round <= 3) s.timeouts = { home: 1, away: 1 };
  }
  s.quarter = 4 + s.overtime.round;
  s.phase = s.overtime.round >= 3 ? "try" : "scrimmage";
  s.ball = s.overtime.round >= 3 ? 97 : 75;
  newSeries(s);
  s.drive = before.drive + 1;
}
export function applyPlay(
  before: State,
  input: PlayInput,
  id: string = crypto.randomUUID(),
): Play {
  const p = clone(input);
  let s: State = clone(before);
  const team = before.possession;
  if (before.ended) throw new Error("Das Spiel ist beendet.");
  for (const n of [p.yards, p.elapsed, p.returnSpot])
    if (!Number.isInteger(n)) throw new Error("Ganze Zahlen eingeben.");
  if (before.phase === "try" && p.elapsed !== 0)
    throw new Error("Conversions laufen ohne Spieluhr.");
  if (
    p.elapsed < 0 ||
    p.elapsed > before.clock ||
    p.returnSpot < 1 ||
    p.returnSpot >
      (p.result === "blocked" && p.recoveryTeam === team ? 100 : 99)
  )
    throw new Error("Zeit oder Ballspot prüfen.");
  if (
    before.clock === 0 &&
    !before.overtime &&
    !before.untimed &&
    before.phase !== "try"
  )
    throw new Error("Bitte zuerst das nächste Quarter starten.");
  const allowed: Kind[] =
    before.phase === "try"
      ? before.overtime && before.overtime.round >= 2
        ? ["two", "penalty"]
        : ["pat", "two", "penalty"]
      : before.phase === "kickoff"
        ? ["kickoff", "penalty"]
        : [
            "run",
            "pass",
            "sack",
            "kneel",
            "spike",
            "penalty",
            "punt",
            "fieldgoal",
            "grounding",
            "wildsnap",
          ];
  if (!allowed.includes(p.kind))
    throw new Error(
      "Play passt nicht zur Phase. Ab OT2 ist ein 2-Point-Try Pflicht.",
    );
  if (
    ["sack", "kneel", "grounding", "wildsnap"].includes(p.kind) &&
    p.yards > 0
  )
    throw new Error("Hier sind nur Verlust oder null Yards möglich.");
  const results: Partial<Record<Kind, string[]>> = {
    run: ["normal", "fumble", "fumble-kept", "fumble-touchback"],
    pass: [
      "normal",
      "incomplete",
      "interception",
      "fumble",
      "fumble-kept",
      "fumble-touchback",
    ],
    sack: ["normal", "fumble", "fumble-kept", "fumble-touchback"],
    punt: [
      "normal",
      "touchback",
      "faircatch",
      "downed",
      "out",
      "blocked",
      "muff",
    ],
    kickoff: ["normal", "touchback", "faircatch", "downed", "out", "onside"],
    fieldgoal: ["good", "missed", "blocked", "muff"],
    pat: [
      "good",
      "missed",
      "blocked",
      "defensive-two",
      "safety-one",
      "offensive-safety-one",
    ],
    two: [
      "good",
      "missed",
      "blocked",
      "defensive-two",
      "safety-one",
      "offensive-safety-one",
    ],
  };
  if (results[p.kind] && !results[p.kind]!.includes(p.result))
    throw new Error("Ergebnis passt nicht zum Playtyp.");
  if (p.airYards != null && !Number.isFinite(p.airYards))
    throw new Error("Air Yards prüfen.");
  if (p.creditedYards != null) {
    if (!Number.isInteger(p.creditedYards))
      throw new Error("Statistik-Yards prüfen.");
    p.yards = p.creditedYards;
  }
  if (
    (p.kind === "pass" && ["incomplete", "interception"].includes(p.result)) ||
    p.kind === "spike"
  )
    p.yards = 0;
  if (
    p.kind === "wildsnap" &&
    !["fumble", "fumble-kept", "fumble-touchback"].includes(p.result)
  )
    p.result = "fumble-kept";
  const scrim = scrimmageKinds.includes(p.kind);
  const end = before.ball + p.yards;
  if (scrim && (end < 0 || end > 100))
    throw new Error("Endpunkt außerhalb des Feldes.");
  if (
    ["punt", "fieldgoal", "penalty"].includes(p.kind) &&
    (p.yards < 0 || p.yards > 110)
  )
    throw new Error("Distanz prüfen.");
  if (
    (p.laterals?.length || 0) &&
    (!scrim || ["interception", "incomplete"].includes(p.result))
  )
    throw new Error("Laterals benötigen einen Lauf oder vollständigen Pass.");
  for (const l of p.laterals || [])
    if (!l.player || !Number.isInteger(l.yards))
      throw new Error("Lateral-Spieler und Yards ergänzen.");
  const originalTurnover =
    ["interception", "fumble", "fumble-touchback"].includes(p.result) && scrim;
  let turnover = originalTurnover;
  let touchdown = scrim && !turnover && end === 100;
  let safety = scrim && !turnover && end === 0;
  let firstDown =
    scrim && !turnover && !before.goalToGo && p.yards >= before.distance;
  let scoringTeam: Team | undefined = touchdown
    ? team
    : safety
      ? other(team)
      : undefined;
  let countsStats = p.kind !== "penalty";
  let penaltyFirstDowns = 0;
  let conversionEligible = true;
  const switchTo = (owner: Team, spot: number) => {
    s.possession = owner;
    s.ball = spot;
    s.phase = "scrimmage";
    s.drive = before.drive + 1;
    newSeries(s);
  };
  if (scrim) {
    s.ball = end;
    if (touchdown) {
      s[team] += 6;
      s.phase = "try";
      s.ball = 97;
    } else if (safety) {
      s[other(team)] += 2;
      s.phase = "kickoff";
      s.ball = 20;
      s.freeKick = true;
    } else if (turnover)
      switchTo(
        other(team),
        p.result === "fumble-touchback" ? 20 : p.returnSpot,
      );
    else if (firstDown) newSeries(s);
    else if (before.down === 4) switchTo(other(team), 100 - end);
    else {
      s.down++;
      s.distance = before.distance - p.yards;
    }
  } else if (["pat", "two"].includes(p.kind)) {
    if (p.result === "good") {
      s[team] += p.kind === "pat" ? 1 : 2;
      scoringTeam = team;
    }
    if (p.result === "defensive-two") {
      s[other(team)] += 2;
      scoringTeam = other(team);
    }
    if (p.result === "safety-one") {
      s[other(team)] += 1;
      scoringTeam = other(team);
    }
    if (p.result === "offensive-safety-one") {
      s[team] += 1;
      scoringTeam = team;
    }
    s.phase = "kickoff";
    s.ball = 35 + (s.pendingKickoff || 0);
    s.pendingKickoff = 0;
  } else if (p.kind === "fieldgoal" && p.result === "good") {
    s[team] += 3;
    scoringTeam = team;
    s.phase = "kickoff";
    s.ball = 35;
  } else if (["punt", "kickoff", "fieldgoal"].includes(p.kind)) {
    if (p.result === "blocked" && p.kind === "punt") {
      p.puntTeam = true;
    }
    if (p.result === "onside") {
      if (p.kind !== "kickoff" || !p.recoveryTeam)
        throw new Error("Onside-Recovery zuordnen.");
      switchTo(p.recoveryTeam, p.returnSpot);
    } else if (p.result === "muff") {
      // Receiver touched a kick beyond the neutral zone without establishing possession.
      if (p.recoveryTeam !== team || p.returnSpot <= before.ball)
        throw new Error(
          "Muff: Recovery des kickenden Teams jenseits der Line erfassen.",
        );
      switchTo(team, p.returnSpot);
    } else if (p.result === "blocked" && p.recoveryTeam === team) {
      s.ball = p.returnSpot;
      if (s.ball === 100) {
        s[team] += 6;
        touchdown = true;
        scoringTeam = team;
        s.phase = "try";
        s.ball = 97;
      } else if (s.ball >= before.ball + before.distance) newSeries(s);
      else if (before.down === 4) switchTo(other(team), 100 - s.ball);
      else {
        s.down++;
        s.distance = before.distance + before.ball - s.ball;
      }
    } else if (p.result === "touchback")
      switchTo(other(team), p.kind === "kickoff" && !before.freeKick ? 25 : 20);
    else if (p.result === "faircatch") {
      const spot = p.fairCatchSpot ?? p.returnSpot;
      if (!Number.isInteger(spot) || spot < 0 || spot > 99)
        throw new Error("Fair-Catch-Spot prüfen.");
      switchTo(
        other(team),
        p.kind === "kickoff" && !before.freeKick && spot < 25
          ? 25
          : Math.max(1, spot),
      );
    } else
      switchTo(
        other(team),
        p.kind === "fieldgoal" && p.result === "missed" && !p.kickSpotOverride
          ? Math.max(20, 100 - before.ball)
          : p.returnSpot,
      );
    s.freeKick = false;
  }
  const legs = p.returns || [];
  if (legs.length) {
    if (
      !(
        originalTurnover || ["punt", "kickoff", "fieldgoal"].includes(p.kind)
      ) ||
      [
        "touchback",
        "faircatch",
        "downed",
        "out",
        "onside",
        "fumble-touchback",
        "good",
      ].includes(p.result)
    )
      throw new Error("Return passt nicht zum Ergebnis.");
    let previous: ReturnLeg | undefined;
    for (const leg of legs) {
      if (
        ![leg.from, leg.to].every(
          (n) => Number.isInteger(n) && n >= 0 && n <= 100,
        )
      )
        throw new Error("Return-Spots müssen zwischen 0 und 100 liegen.");
      if (previous) {
        if (previous.to === 100 || previous.to === 0)
          throw new Error("Nach einem Score ist kein Return möglich.");
        if (
          leg.team !== previous.team &&
          (!previous.fumbled || leg.type !== "fumble")
        )
          throw new Error("Ein weiterer Ballwechsel benötigt einen Fumble.");
        if (
          leg.from !==
          (leg.team === previous.team ? previous.to : 100 - previous.to)
        )
          throw new Error("Die Return-Spots müssen aneinander anschließen.");
        if (
          leg.team === previous.team &&
          leg.type !== "lateral" &&
          !previous.fumbled
        )
          throw new Error("Weitergabe als Lateral markieren.");
      } else {
        const type =
          p.result === "interception"
            ? "interception"
            : originalTurnover
              ? "fumble"
              : p.kind;
        if (leg.team !== other(team) || leg.type !== type)
          throw new Error(
            "Ersten Return dem empfangenden Team und passenden Typ zuordnen.",
          );
      }
      previous = leg;
    }
    const last = legs.at(-1)!;
    if (last.fumbled)
      throw new Error("Recovery nach dem letzten Fumble ergänzen.");
    switchTo(last.team, Math.max(1, Math.min(99, last.to)));
    if (last.to === 100) {
      s[last.team] += 6;
      scoringTeam = last.team;
      touchdown = true;
      s.phase = "try";
      s.ball = 97;
    }
    if (last.to === 0) {
      s[other(last.team)] += 2;
      scoringTeam = other(last.team);
      safety = true;
      s.phase = "kickoff";
      s.ball = 20;
      s.freeKick = true;
    }
    firstDown = false;
  }
  if (p.kind === "penalty" && !p.penalties?.length)
    p.penalties = [
      {
        name: p.note || "Strafe",
        team: p.penaltyTeam,
        status: "accepted",
        timing: "live",
        spot: "previous",
        foulSpot: before.ball,
        yards: p.yards,
        halfDistance: false,
        mode: p.penaltyMode,
        keepStats: false,
        safety: false,
      },
    ];
  if (p.kind === "grounding") {
    // NCAA: team rushing loss, no pass attempt and no sack. Loss is yardage, not penalty yards.
    p.player = "";
    p.penalties = [
      {
        name: "Intentional Grounding",
        team,
        status: "accepted",
        timing: "live",
        spot: "end",
        foulSpot: end,
        yards: 0,
        halfDistance: false,
        mode: "next",
        keepStats: true,
        safety: false,
      },
      ...(p.penalties || []),
    ];
  }
  const fouls = p.penalties || [];
  const otChanged = !!before.overtime && (originalTurnover || legs.length > 0);
  const otCancelFouls =
    otChanged &&
    fouls.some(
      (f) => f.team !== team && f.afterChange && f.status === "offsetting",
    ) &&
    !fouls.some(
      (f) =>
        f.team !== team &&
        !f.afterChange &&
        f.timing === "live" &&
        f.status !== "declined",
    );
  const deferred: Penalty[] = [];
  const otHandled = new Set<Penalty>();
  for (const f of fouls) {
    if (!before.overtime || f.status === "declined") continue;
    if (f.afterChange && !otChanged)
      throw new Error(
        "Foul nach Ballwechsel benötigt einen Return oder Turnover.",
      );
    if (
      (otChanged && f.afterChange) ||
      otCancelFouls ||
      (f.timing === "dead" &&
        (otChanged || s.possession !== team || s.phase !== "scrimmage"))
    ) {
      otHandled.add(f);
      if (f.timing === "live" && scoringTeam === f.team) {
        s.home = before.home;
        s.away = before.away;
        scoringTeam = undefined;
        touchdown = safety = false;
      }
      if (f.carryOver || f.timing === "dead") deferred.push(f);
      else f.status = "declined";
    }
  }
  const offset = fouls.some(
    (f) => !otHandled.has(f) && f.status === "offsetting",
  );
  const nullified =
    offset ||
    fouls.some(
      (f) =>
        !otHandled.has(f) &&
        f.status === "accepted" &&
        f.timing === "live" &&
        !f.keepStats,
    );
  if (nullified) {
    s = clone(before);
    countsStats = false;
    firstDown = touchdown = safety = turnover = false;
    scoringTeam = undefined;
    conversionEligible = false;
  }
  for (const f of fouls) {
    if (
      !Number.isInteger(f.yards) ||
      f.yards < 0 ||
      f.yards > 99 ||
      !Number.isInteger(f.foulSpot) ||
      f.foulSpot < 0 ||
      f.foulSpot > 100
    )
      throw new Error("Straf-Yards oder Enforcement-Spot prüfen.");
    if (
      otHandled.has(f) ||
      f.status !== "accepted" ||
      (offset && f.timing === "live")
    )
      continue;
    if (f.safety) {
      s[other(f.team)] += before.phase === "try" ? 1 : 2;
      scoringTeam = other(f.team);
      safety = true;
      s.possession = before.phase === "try" ? team : f.team;
      s.phase = "kickoff";
      s.ball = before.phase === "try" ? 35 : 20;
      s.freeKick = before.phase !== "try";
      continue;
    }
    if (f.spot === "kickoff") {
      s.pendingKickoff =
        (s.pendingKickoff || 0) + (f.team === team ? -f.yards : f.yards);
      if (s.phase === "kickoff") {
        s.ball += s.pendingKickoff;
        s.pendingKickoff = 0;
      }
      continue;
    }
    const owner = f.spot === "end" ? s.possession : team;
    let spot =
      f.spot === "previous"
        ? before.ball
        : f.spot === "foul"
          ? f.foulSpot
          : s.ball;
    if (f.halfDistance)
      f.yards = Math.floor((f.team === owner ? spot : 100 - spot) / 2);
    const next = spot + (f.team === owner ? -f.yards : f.yards);
    if (next <= 0 || next >= 100)
      throw new Error(
        "Strafe endet an einer Goalline. Half-Distance oder Safety wählen.",
      );
    const live = f.timing === "live";
    const lineToGain = live
      ? before.ball + before.distance
      : s.ball + s.distance;
    s.ball = next;
    s.possession = owner;
    if (before.phase !== "scrimmage") {
      if (live) s.phase = before.phase;
      if (before.phase === "try" && f.team === team && f.mode === "loss") {
        s.phase = "kickoff";
        s.ball = 35;
      }
      continue;
    }
    if (live && !touchdown) s.phase = "scrimmage";
    if (f.mode === "first" || next >= lineToGain) {
      if (f.team !== owner) penaltyFirstDowns++;
      newSeries(s);
    } else {
      s.distance = Math.min(100 - next, lineToGain - next);
      if (live) {
        if (f.mode === "repeat") s.down = before.down;
        else if (f.mode === "loss") s.down = before.down + 1;
        if (s.down > 4) switchTo(other(owner), 100 - next);
      }
    }
    if (live && f.team === team) firstDown = false;
    if (live && penaltyFirstDowns && !(firstDown || touchdown))
      conversionEligible = false;
  }
  // The official's untimed-down ruling is explicit, since enforcement exceptions matter.
  s.clock = before.overtime ? 0 : before.clock - p.elapsed;
  s.untimed = !before.overtime && s.clock === 0 && !!p.untimedAfter;
  if (before.overtime && !offset) {
    const defensiveScore =
      before.phase !== "try" &&
      scoringTeam !== undefined &&
      scoringTeam !== team;
    const possessionEnded =
      (before.phase === "try" && s.phase !== "try") ||
      (!nullified && (s.phase === "kickoff" || (turnover && !touchdown))) ||
      s.possession !== team ||
      safety;
    const walkOffTD =
      touchdown && before.overtime.series === 2 && s[team] > s[other(team)];
    if (defensiveScore || walkOffTD) s.ended = true;
    else if (possessionEnded) finishOT(s, before, false);
  }
  for (const f of deferred) {
    if (s.ended) continue;
    // Rule 3-1-3g: qualifying penalties move the succeeding play, not the return spot.
    if (f.halfDistance)
      f.yards = Math.floor(
        (f.team === s.possession ? s.ball : 100 - s.ball) / 2,
      );
    s.ball += f.team === s.possession ? -f.yards : f.yards;
    if (s.ball <= 0 || s.ball >= 100)
      throw new Error("OT-Strafe: Half Distance prüfen.");
    newSeries(s);
  }
  return {
    ...p,
    id,
    before: clone(before),
    after: s,
    countsStats,
    firstDown,
    penaltyFirstDowns,
    touchdown,
    safety,
    turnover,
    scoringTeam,
    conversionEligible,
    ruleset: RULESET,
    success:
      countsStats &&
      scrim &&
      !turnover &&
      p.yards >=
        before.distance *
          (before.down === 1 ? 0.5 : before.down === 2 ? 0.7 : 1),
    explosive: countsStats && scrim && p.yards >= (p.kind === "pass" ? 20 : 10),
  };
}
export function specialTeamsStats(plays: Play[], team: Team) {
  const events = statisticalPlays(plays).filter(
    (p) => p.before.phase !== "try",
  );
  const punts = events.filter(
    (p) => p.before.possession === team && p.kind === "punt",
  );
  const returns = events.flatMap((p) => p.returns || []);
  const puntYards = punts.reduce((n, p) => n + p.yards, 0);
  const puntReturns = events
    .filter((p) => p.kind === "punt" && p.before.possession === team)
    .flatMap((p) => p.returns || []);
  const touchbacks = punts.filter((p) => p.result === "touchback").length;
  return {
    punts: punts.length,
    puntYards,
    puntNet:
      punts.length &&
      punts.every((p) => p.result !== "normal" || !!p.returns?.length)
        ? (
            (puntYards -
              puntReturns
                .filter((r) => r.team !== team)
                .reduce((n, r) => n + r.to - r.from, 0) -
              20 * touchbacks) /
            punts.length
          ).toFixed(1)
        : "—",
    inside20: punts.filter(
      (p) =>
        p.result !== "touchback" &&
        p.after.possession !== team &&
        p.after.ball < 20 &&
        !p.touchdown,
    ).length,
    touchbacks,
    puntReturns: returns.filter((r) => r.team === team && r.type === "punt")
      .length,
    puntReturnYards: returnYards(events, team, "punt"),
    kickReturns: returns.filter((r) => r.team === team && r.type === "kickoff")
      .length,
    kickReturnYards: returnYards(events, team, "kickoff"),
    intReturnYards: returnYards(events, team, "interception"),
    fumbleReturnYards: returnYards(events, team, "fumble"),
    returnTD: events.filter(
      (p) => p.touchdown && p.scoringTeam === team && p.returns?.length,
    ).length,
  };
}
function returnYards(plays: Play[], team: Team, type: ReturnLeg["type"]) {
  let total = 0;
  for (const p of plays) {
    let category: ReturnLeg["type"] | undefined;
    for (const r of p.returns || []) {
      if (r.type !== "lateral") category = r.type;
      if (r.team === team && category === type) total += r.to - r.from;
    }
  }
  return total;
}
export function individualYards(p: Play, number: string): number {
  const original = p.kind === "pass" ? p.target : p.player;
  const laterals = p.laterals || [];
  return (
    (original === number
      ? p.yards - laterals.reduce((n, l) => n + l.yards, 0)
      : 0) +
    laterals.filter((l) => l.player === number).reduce((n, l) => n + l.yards, 0)
  );
}
export function teamStats(plays: Play[], team: Team) {
  const all = statisticalPlays(plays).filter(
    (p) => p.before.possession === team && p.before.phase !== "try",
  );
  const scrim = all.filter((p) =>
    ["run", "pass", "sack", "kneel", "spike", "grounding", "wildsnap"].includes(
      p.kind,
    ),
  );
  const passing = all.filter((p) => p.kind === "pass" || p.kind === "spike");
  const rushing = all.filter((p) =>
    ["run", "sack", "kneel", "grounding", "wildsnap"].includes(p.kind),
  );
  const complete = passing.filter(
    (p) =>
      p.result !== "incomplete" &&
      p.result !== "interception" &&
      p.kind !== "spike",
  );
  const sum = (list: Play[]) => list.reduce((n, p) => n + p.yards, 0);
  const third = scrim.filter(
    (p) => p.before.down === 3 && p.conversionEligible !== false,
  );
  const fourth = scrim.filter(
    (p) => p.before.down === 4 && p.conversionEligible !== false,
  );
  const rz = new Set(
    all
      .filter(
        (p) =>
          (p.before.phase === "scrimmage" && p.before.ball >= 80) ||
          (p.after.phase === "scrimmage" &&
            p.after.possession === team &&
            p.after.ball >= 80 &&
            !p.turnover),
      )
      .map((p) => p.before.drive),
  );
  const rzScored = new Set(
    all
      .filter(
        (p) =>
          rz.has(p.before.drive) &&
          ((p.touchdown && (!p.scoringTeam || p.scoringTeam === team)) ||
            (p.kind === "fieldgoal" && p.result === "good")),
      )
      .map((p) => p.before.drive),
  );
  const yards = sum(scrim),
    passYards = sum(complete),
    interceptions = passing.filter((p) => p.result === "interception").length,
    passTD = complete.filter(
      (p) => p.touchdown && (!p.scoringTeam || p.scoringTeam === team),
    ).length;
  const penalties = plays.flatMap((p) =>
    p.penalties?.length
      ? p.penalties.filter(
          (f) =>
            f.status === "accepted" &&
            f.team === team &&
            !(
              p.penalties?.some((x) => x.status === "offsetting") &&
              f.timing === "live"
            ),
        )
      : p.kind === "penalty" && p.penaltyTeam === team
        ? [{ yards: p.yards }]
        : [],
  );
  const special = specialTeamsStats(plays, team);
  return {
    plays: scrim.length,
    yards,
    passYards,
    rushYards: sum(rushing),
    rushAttempts: rushing.length,
    attempts: passing.length,
    completions: complete.length,
    interceptions,
    firstDowns: plays
      .filter((p) => p.before.possession === team)
      .reduce(
        (n, p) => n + (p.firstDown ? 1 : 0) + (p.penaltyFirstDowns || 0),
        0,
      ),
    thirdAttempts: third.length,
    thirdMade: third.filter(
      (p) =>
        p.firstDown ||
        (p.touchdown && (!p.scoringTeam || p.scoringTeam === team)),
    ).length,
    fourthAttempts: fourth.length,
    fourthMade: fourth.filter(
      (p) =>
        p.firstDown ||
        (p.touchdown && (!p.scoringTeam || p.scoringTeam === team)),
    ).length,
    success: scrim.length
      ? Math.round((scrim.filter((p) => p.success).length / scrim.length) * 100)
      : 0,
    explosive: scrim.filter((p) => p.explosive).length,
    turnovers: statisticalPlays(plays)
      .filter((p) => p.before.phase !== "try")
      .reduce(
        (n, p) =>
          n +
          (p.before.possession === team && p.turnover ? 1 : 0) +
          (p.returns || []).filter(
            (r, i, list) =>
              r.team === team && r.fumbled && list[i + 1]?.team !== team,
          ).length,
        0,
      ),
    fumbles:
      all.filter((p) =>
        ["fumble", "fumble-kept", "fumble-touchback"].includes(p.result),
      ).length +
      statisticalPlays(plays)
        .flatMap((p) => p.returns || [])
        .filter((r) => r.team === team && r.fumbled).length,
    sacks: all.filter((p) => p.kind === "sack").length,
    penaltyCount: penalties.length,
    penaltyYards: penalties.reduce((n, p) => n + p.yards, 0),
    ...special,
    possession: plays
      .filter(
        (p) =>
          p.before.possession === team &&
          !p.before.overtime &&
          p.before.phase !== "try",
      )
      .reduce((n, p) => n + p.elapsed, 0),
    redzone: rz.size,
    redzoneScored: rzScored.size,
    ypp: scrim.length ? (yards / scrim.length).toFixed(1) : "0.0",
    rating: passing.length
      ? (
          (8.4 * passYards +
            100 * complete.length +
            330 * passTD -
            200 * interceptions) /
          passing.length
        ).toFixed(1)
      : "—",
  };
}
export function makeDemo(): Play[] {
  let state = initialState();
  const result: Play[] = [];
  const add = (kind: Kind, yards: number, extra: Partial<PlayInput> = {}) => {
    const play = applyPlay(
      state,
      {
        ...blankInput(),
        kind,
        yards,
        direction: ["Links", "Mitte", "Rechts"][result.length % 3]!,
        formation: "Shotgun",
        elapsed: kind === "pat" ? 0 : 27,
        ...extra,
      },
      `demo-${result.length}`,
    );
    result.push(play);
    state = play.after;
  };
  add("run", 6);
  add("pass", 17, { player: "12", target: "81" });
  add("run", 4);
  add("pass", 0, { player: "12", result: "incomplete" });
  add("pass", 23, { player: "12", target: "11" });
  add("run", 8);
  add("pass", 17, { player: "12", target: "81" });
  add("pat", 0, { player: "3", result: "good" });
  add("kickoff", 0, { player: "3", result: "touchback", elapsed: 0 });
  add("run", 12, { player: "24" });
  add("pass", 28, { player: "7", target: "10" });
  add("run", 7, { player: "24" });
  add("pass", 28, { player: "7", target: "18" });
  add("pat", 0, { player: "9", result: "good" });
  add("kickoff", 0, { player: "9", result: "touchback", elapsed: 0 });
  add("run", 9);
  add("run", 12);
  add("pass", 0, { player: "12", result: "incomplete" });
  add("sack", -5, { player: "12" });
  add("pass", 32, { player: "12", target: "11" });
  add("run", 11);
  add("pass", 16, { player: "12", target: "81" });
  add("pat", 0, { player: "3", result: "good" });
  add("kickoff", 0, { player: "3", result: "touchback", elapsed: 0 });
  add("run", 3, { player: "24" });
  add("pass", 0, { player: "7", target: "10", result: "incomplete" });
  add("pass", 0, { player: "7", target: "10", result: "incomplete" });
  add("punt", 42, { player: "9", returnSpot: 35 });
  add("pass", 12, { player: "12", target: "81" });
  add("run", 5);
  return result;
}

export function filterHalf(
  plays: Play[],
  half: "all" | "first" | "second" | "ot",
): Play[] {
  return half === "all"
    ? plays
    : plays.filter((p) =>
        half === "ot"
          ? !!p.before.overtime
          : half === "first"
            ? p.before.quarter <= 2
            : p.before.quarter >= 3 && p.before.quarter <= 4,
      );
}

export function defensiveCredits(plays: Play[], team: Team, number: string) {
  const events = statisticalPlays(plays).filter(
    (p) => p.before.possession !== team && p.before.phase !== "try",
  );
  const share = (p: Play) =>
    p.tackler === number ? (p.assist ? 0.5 : 1) : p.assist === number ? 0.5 : 0;
  return {
    hurries: events.filter((p) => p.hurry === number).length,
    blocks: events.filter(
      (p) => p.blockedBy === number && p.result === "blocked",
    ).length,
    solo: events.filter((p) => p.tackler === number && !p.assist).length,
    assists: events.filter(
      (p) => p.assist === number || (p.tackler === number && p.assist),
    ).length,
    sacks: events
      .filter((p) => p.kind === "sack")
      .reduce((n, p) => n + share(p), 0),
    tfl: events
      .filter((p) => ["run", "sack"].includes(p.kind) && p.yards < 0)
      .reduce((n, p) => n + share(p), 0),
    interceptions: events.filter(
      (p) => p.result === "interception" && p.interceptor === number,
    ).length,
    forced: events.filter(
      (p) =>
        ["fumble", "fumble-kept", "fumble-touchback"].includes(p.result) &&
        p.forcedBy === number,
    ).length,
    recoveries: events.filter(
      (p) => p.result === "fumble" && p.recoveredBy === number,
    ).length,
    breakups: events.filter(
      (p) =>
        p.kind === "pass" && p.result === "incomplete" && p.breakup === number,
    ).length,
  };
}

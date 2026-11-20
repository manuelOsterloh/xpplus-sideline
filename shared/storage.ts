import { labels, type Play, type State } from "./game";
import { categories, type CallEntry } from "./playbook";

export const STORAGE_KEY = "xp-sideline-v1";
export const RECOVERY_KEY = "xp-sideline-recovery";
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export interface StoredPlayer {
  number: string;
  name: string;
  position: string;
  team: "home" | "away";
}
export interface GameSnapshot {
  version: 1;
  isDemo: boolean;
  plays: Play[];
  revisions: {
    id: string;
    before: Play[];
    after: Play[];
    reason: string;
    at: string;
  }[];
  club: {
    name: string;
    short: string;
    opponent: string;
    opponentShort: string;
    primary: string;
    secondary: string;
    accent: string;
    logo: string;
  };
  roster: StoredPlayer[];
  override: State | null;
  playbook: CallEntry[];
  settings: { night: boolean; quarterMinutes: number; playClock: number };
  adjustments: { before: State; after: State; at: string }[];
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 500): value is string =>
  typeof value === "string" && value.length <= max;
const integer = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const team = (value: unknown) => value === "home" || value === "away";
function requireValue(valid: unknown, label: string): asserts valid {
  if (!valid)
    throw new Error(
      `Sicherung ungültig: ${label}. Die vorhandenen Daten bleiben erhalten.`,
    );
}
export function validState(value: unknown): value is State {
  if (!record(value)) return false;
  if (
    !(
      team(value.possession) &&
      integer(value.ball, 0, 100) &&
      integer(value.down, 1, 4) &&
      integer(value.distance, 0, 100) &&
      integer(value.home, 0, 10000) &&
      integer(value.away, 0, 10000) &&
      integer(value.quarter, 1, 1000) &&
      integer(value.clock, 0, 14400) &&
      integer(value.drive, 1, 10000) &&
      typeof value.goalToGo === "boolean" &&
      ["scrimmage", "try", "kickoff"].includes(String(value.phase))
    )
  )
    return false;
  if (value.overtime != null) {
    const o = value.overtime;
    if (
      !record(o) ||
      !integer(o.round, 1, 996) ||
      ![1, 2].includes(Number(o.series)) ||
      !team(o.first) ||
      (o.nextFirst != null && !team(o.nextFirst)) ||
      value.quarter !== 4 + Number(o.round) ||
      value.clock !== 0
    )
      return false;
  }
  if (
    value.timeouts != null &&
    (!record(value.timeouts) ||
      !integer(value.timeouts.home, 0, 3) ||
      !integer(value.timeouts.away, 0, 3))
  )
    return false;
  if (
    value.pendingKickoff !== undefined &&
    !integer(value.pendingKickoff, -100, 100)
  )
    return false;
  return ["ended", "untimed", "freeKick"].every(
    (key) => value[key] === undefined || typeof value[key] === "boolean",
  );
}
function validPlay(value: unknown): value is Play {
  if (
    !record(value) ||
    !text(value.id) ||
    !Object.hasOwn(labels, String(value.kind)) ||
    !validState(value.before) ||
    !validState(value.after)
  )
    return false;
  if (
    !integer(value.yards, -110, 110) ||
    !integer(value.elapsed, 0, 14400) ||
    !integer(value.returnSpot, 0, 100)
  )
    return false;
  if (
    ![
      "normal",
      "incomplete",
      "interception",
      "fumble",
      "fumble-kept",
      "good",
      "missed",
      "touchback",
      "faircatch",
      "downed",
      "out",
      "blocked",
      "muff",
      "onside",
      "defensive-two",
      "safety-one",
      "offensive-safety-one",
      "fumble-touchback",
    ].includes(String(value.result))
  )
    return false;
  if (
    ![
      "firstDown",
      "touchdown",
      "safety",
      "turnover",
      "success",
      "explosive",
    ].every((key) => typeof value[key] === "boolean")
  )
    return false;
  if (
    ![
      "player",
      "target",
      "tackler",
      "assist",
      "direction",
      "formation",
      "note",
    ].every((key) => text(value[key], 10000))
  )
    return false;
  if (
    value.airYards != null &&
    (typeof value.airYards !== "number" || !Number.isFinite(value.airYards))
  )
    return false;
  if (
    ![
      "countsStats",
      "conversionEligible",
      "timeEstimated",
      "untimedAfter",
      "puntTeam",
      "kickSpotOverride",
    ].every(
      (key) => value[key] === undefined || typeof value[key] === "boolean",
    )
  )
    return false;
  if (
    value.penaltyFirstDowns !== undefined &&
    !integer(value.penaltyFirstDowns, 0, 10)
  )
    return false;
  if (value.scoringTeam !== undefined && !team(value.scoringTeam)) return false;
  if (value.recoveryTeam !== undefined && !team(value.recoveryTeam))
    return false;
  if (
    value.returns != null &&
    (!Array.isArray(value.returns) ||
      !value.returns.every(
        (r) =>
          record(r) &&
          team(r.team) &&
          text(r.player) &&
          integer(r.from, 0, 100) &&
          integer(r.to, 0, 100) &&
          typeof r.fumbled === "boolean" &&
          [
            "punt",
            "kickoff",
            "interception",
            "fumble",
            "fieldgoal",
            "lateral",
          ].includes(String(r.type)),
      ))
  )
    return false;
  if (
    value.laterals != null &&
    (!Array.isArray(value.laterals) ||
      !value.laterals.every(
        (l) => record(l) && text(l.player) && integer(l.yards, -110, 110),
      ))
  )
    return false;
  if (
    value.penalties != null &&
    (!Array.isArray(value.penalties) ||
      !value.penalties.every(
        (f) =>
          record(f) &&
          text(f.name) &&
          team(f.team) &&
          ["accepted", "declined", "offsetting"].includes(String(f.status)) &&
          ["live", "dead"].includes(String(f.timing)) &&
          ["previous", "end", "foul", "kickoff"].includes(String(f.spot)) &&
          ["repeat", "first", "loss", "next"].includes(String(f.mode)) &&
          integer(f.yards, 0, 99) &&
          integer(f.foulSpot, 0, 100) &&
          ["halfDistance", "keepStats", "safety"].every(
            (k) => typeof f[k] === "boolean",
          ),
      ))
  )
    return false;
  return true;
}
function plays(value: unknown): value is Play[] {
  return (
    Array.isArray(value) &&
    value.length <= 10000 &&
    value.every(validPlay) &&
    new Set(value.map((p) => p.id)).size === value.length
  );
}
/** Validate external and browser-persisted data before any reactive state is changed.
 * Older v1 saves may omit optional metadata. Exported v1 files use `state` instead of `override`.
 */
export function parseSnapshot(
  raw: string | unknown,
  defaults: GameSnapshot,
): GameSnapshot {
  let value: unknown = raw;
  if (typeof raw === "string") {
    requireValue(
      new TextEncoder().encode(raw).byteLength <= MAX_BACKUP_BYTES,
      "Datei ist zu groß",
    );
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(
        "Sicherung ist kein lesbares JSON. Die vorhandenen Daten bleiben erhalten.",
      );
    }
  }
  requireValue(
    record(value) && value.version === 1,
    "Dateiformat oder Version",
  );
  requireValue(plays(value.plays), "Spielzüge");
  const next = {
    ...defaults,
    ...value,
    isDemo: value.isDemo ?? value.plays.some((p) => p.id.startsWith("demo-")),
    override: Object.hasOwn(value, "override")
      ? value.override
      : (value.state ?? null),
  } as unknown as GameSnapshot;
  requireValue(typeof next.isDemo === "boolean", "Demo-Kennzeichnung");
  requireValue(
    next.override === null || validState(next.override),
    "Spielsituation",
  );
  requireValue(record(next.club), "Club");
  requireValue(
    ["name", "short", "opponent", "opponentShort"].every((k) =>
      text(next.club[k as keyof typeof next.club], 200),
    ),
    "Clubnamen",
  );
  requireValue(
    ["primary", "secondary", "accent"].every((k) =>
      /^#[\da-f]{6}$/i.test(next.club[k as keyof typeof next.club]),
    ),
    "Clubfarben",
  );
  requireValue(
    text(next.club.logo, 4 * 1024 * 1024) &&
      (!next.club.logo ||
        /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(next.club.logo)),
    "Clublogo",
  );
  requireValue(
    Array.isArray(next.roster) &&
      next.roster.length <= 500 &&
      next.roster.every(
        (p) =>
          record(p) &&
          team(p.team) &&
          text(p.number, 3) &&
          /^\d{1,3}$/.test(p.number) &&
          text(p.name, 200) &&
          text(p.position, 50),
      ),
    "Kader",
  );
  requireValue(
    new Set(next.roster.map((p) => `${p.team}:${p.number}`)).size ===
      next.roster.length,
    "doppelte Trikotnummern",
  );
  requireValue(
    record(next.settings) &&
      typeof next.settings.night === "boolean" &&
      [8, 10, 12, 15].includes(next.settings.quarterMinutes) &&
      [25, 40].includes(next.settings.playClock),
    "Einstellungen",
  );
  requireValue(
    Array.isArray(next.playbook) &&
      next.playbook.length <= 2000 &&
      next.playbook.every(
        (c) =>
          record(c) &&
          text(c.id) &&
          text(c.name, 200) &&
          categories.some((cat) => cat.id === c.category) &&
          (c.coverageType === undefined ||
            ["Man", "Zone"].includes(c.coverageType)),
      ),
    "Playbook",
  );
  requireValue(
    Array.isArray(next.adjustments) &&
      next.adjustments.every(
        (a) =>
          record(a) &&
          validState(a.before) &&
          validState(a.after) &&
          text(a.at),
      ),
    "Spielkorrekturen",
  );
  requireValue(
    Array.isArray(next.revisions) &&
      next.revisions.every(
        (r) =>
          record(r) &&
          text(r.id) &&
          text(r.reason, 10000) &&
          text(r.at) &&
          plays(r.before) &&
          plays(r.after),
      ),
    "Review-Verlauf",
  );
  // Clone the accepted object so a caller cannot later mutate installed state through the input reference.
  return JSON.parse(JSON.stringify(next));
}

export interface LocalStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Atomic primary write. A backup failure leaves the current game untouched. */
export function replaceStoredSnapshot(
  storage: LocalStore,
  next: GameSnapshot,
  previousOverride?: string | null,
) {
  const serialized = JSON.stringify(next);
  const previous =
    previousOverride === undefined
      ? storage.getItem(STORAGE_KEY)
      : previousOverride;
  if (previous !== null) storage.setItem(RECOVERY_KEY, previous);
  storage.setItem(STORAGE_KEY, serialized);
  return serialized;
}

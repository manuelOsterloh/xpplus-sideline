import test from "node:test";
import assert from "node:assert/strict";
import { makeDemo, initialState, blankInput } from "../shared/game";
import { defaultPlaybook } from "../shared/playbook";
import {
  parseSnapshot,
  replaceStoredSnapshot,
  STORAGE_KEY,
  RECOVERY_KEY,
  type GameSnapshot,
} from "../shared/storage";

function snapshot(): GameSnapshot {
  return {
    version: 1,
    isDemo: true,
    plays: makeDemo(),
    revisions: [],
    override: null,
    club: {
      name: "Home",
      short: "HOM",
      opponent: "Away",
      opponentShort: "AWY",
      primary: "#193c32",
      secondary: "#dbf479",
      accent: "#f4f2eb",
      logo: "",
    },
    roster: [{ number: "12", name: "Player", position: "QB", team: "home" }],
    settings: { night: false, quarterMinutes: 15, playClock: 25 },
    playbook: defaultPlaybook(),
    adjustments: [],
  };
}
class MemoryStore {
  values = new Map<string, string>();
  failKey = "";
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failKey === key) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
}
test("valid local snapshots round-trip and detach from input references", () => {
  const original = snapshot();
  const restored = parseSnapshot(JSON.stringify(original), snapshot());
  assert.deepEqual(restored, JSON.parse(JSON.stringify(original)));
  restored.club.name = "Changed";
  assert.equal(original.club.name, "Home");
});
test("old JSON exports restore their explicit current situation", () => {
  const s = snapshot();
  const { override, isDemo, ...old } = s;
  const current = { ...initialState(), quarter: 3, clock: 120, ball: 60 };
  const restored = parseSnapshot({ ...old, state: current }, s);
  assert.deepEqual(restored.override, current);
  assert.equal(restored.isDemo, true);
});
test("legacy demo provenance follows generated event IDs, never club names", () => {
  const original = snapshot();
  const { isDemo, ...legacy } = original;
  const real = {
    ...legacy,
    plays: legacy.plays.map((p, i) => ({ ...p, id: `event-${i}` })),
  };
  assert.equal(parseSnapshot(real, original).isDemo, false);
  assert.equal(parseSnapshot({ ...real, isDemo: true }, original).isDemo, true);
});
test("broken states, unsupported versions and malformed payloads reject before installation", () => {
  const s = snapshot();
  for (const value of [
    null,
    {},
    { version: 2, plays: [] },
    { ...s, plays: [{}] },
    { ...s, override: { ...initialState(), ball: 1000 } },
    { ...s, settings: { night: false, quarterMinutes: 0, playClock: 0 } },
  ]) {
    assert.throws(() => parseSnapshot(value, s), /Sicherung ungültig/);
  }
  assert.throws(() => parseSnapshot("{broken", s), /kein lesbares JSON/);
  assert.equal(s.plays.length, 30);
});
test("duplicate player or event identities cannot silently merge statistics", () => {
  const s = snapshot();
  assert.throws(
    () => parseSnapshot({ ...s, plays: [s.plays[0], s.plays[0]] }, s),
    /Spielzüge/,
  );
  assert.throws(
    () => parseSnapshot({ ...s, roster: [s.roster[0], s.roster[0]] }, s),
    /Trikotnummern/,
  );
});
test("restored media and theme values cannot request an external resource or inject styles", () => {
  const s = snapshot();
  for (const club of [
    { ...s.club, logo: "https://tracker.invalid/logo.png" },
    { ...s.club, logo: "data:image/svg+xml;base64,PHN2Zz4=" },
    { ...s.club, primary: "red; background:url(https://tracker.invalid)" },
  ])
    assert.throws(() => parseSnapshot({ ...s, club }, s));
});
test("invalid nested return, penalty and revision arrays reject", () => {
  const s = snapshot();
  assert.throws(() =>
    parseSnapshot(
      {
        ...s,
        plays: [
          { ...s.plays[0], returns: [{ team: "away", from: 10, to: "TD" }] },
        ],
      },
      s,
    ),
  );
  assert.throws(() =>
    parseSnapshot(
      { ...s, plays: [{ ...s.plays[0], penalties: [{ name: "Holding" }] }] },
      s,
    ),
  );
  assert.throws(() =>
    parseSnapshot(
      {
        ...s,
        revisions: [
          { id: "r1", reason: "x", at: "now", before: [{}], after: [] },
        ],
      },
      s,
    ),
  );
});
test("a replacement keeps the previous serialized game as a recoverable backup", () => {
  const store = new MemoryStore();
  const old = JSON.stringify(snapshot());
  store.setItem(STORAGE_KEY, old);
  const next = {
    ...snapshot(),
    plays: [],
    isDemo: false,
    override: initialState(),
  };
  replaceStoredSnapshot(store, next);
  assert.equal(store.getItem(RECOVERY_KEY), old);
  assert.deepEqual(JSON.parse(store.getItem(STORAGE_KEY)!), next);
});
test("quota failures preserve the active game during replacement", () => {
  for (const key of [RECOVERY_KEY, STORAGE_KEY]) {
    const store = new MemoryStore();
    const old = JSON.stringify(snapshot());
    store.setItem(STORAGE_KEY, old);
    store.failKey = key;
    assert.throws(() =>
      replaceStoredSnapshot(store, { ...snapshot(), plays: [] }),
    );
    assert.equal(store.getItem(STORAGE_KEY), old);
  }
});
test("unreadable source can be preserved verbatim before starting a new game", () => {
  const store = new MemoryStore();
  store.setItem(STORAGE_KEY, "{not valid JSON");
  replaceStoredSnapshot(store, { ...snapshot(), plays: [], isDemo: false });
  assert.equal(store.getItem(RECOVERY_KEY), "{not valid JSON");
});

test("replacement can preserve newer unsaved in-memory work as its backup", () => {
  const store = new MemoryStore();
  store.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  const current = { ...snapshot(), override: { ...initialState(), home: 21 } };
  const raw = JSON.stringify(current);
  replaceStoredSnapshot(store, { ...snapshot(), plays: [] }, raw);
  assert.equal(store.getItem(RECOVERY_KEY), raw);
});

// Nuxt auto-imports are supplied by a small lifecycle harness; the actual composable
// and Vue's real synchronous watchers are exercised, not a second implementation.
async function gameHarness(store = new MemoryStore()) {
  const { registerHooks } = await import("node:module");
  const { ref, computed, watch, effectScope } = await import("vue");
  const aliases = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(
        specifier.startsWith("#shared/")
          ? new URL(`../shared/${specifier.slice(8)}.ts`, import.meta.url).href
          : specifier,
        context,
      );
    },
  });
  const { useGame } = await import("../app/composables/useGame");
  aliases.deregister();
  const mounted: (() => void)[] = [];
  const refs = new Map<string, ReturnType<typeof ref>>();
  Object.assign(globalThis, {
    ref,
    computed,
    watch,
    localStorage: store,
    window: {},
    useState: (key: string, init: () => unknown) => {
      if (!refs.has(key)) refs.set(key, ref(init()));
      return refs.get(key);
    },
    onMounted: (cb: () => void) => mounted.push(cb),
    onBeforeUnmount: () => {},
  });
  const scope = effectScope();
  const game = scope.run(() => useGame())!;
  mounted.forEach((cb) => cb());
  return { game, store, stop: () => scope.stop() };
}
test("actual composable prevents premature Final and allows a completed Q4", async () => {
  const { game, stop } = await gameHarness();
  try {
    game.adjustSituation({ ...initialState(), home: 7, clock: 0 });
    assert.throws(() => game.endGame(), /nach Q4/);
    assert.notEqual(game.state.value.ended, true);
    game.adjustSituation({ ...initialState(), quarter: 4, home: 7, clock: 0 });
    game.endGame();
    assert.equal(game.state.value.ended, true);
  } finally {
    stop();
  }
});
test("actual composable emits only one durable state per play and clears old override", async () => {
  const { game, store, stop } = await gameHarness();
  try {
    game.adjustSituation({ ...initialState(), ball: 40 });
    const writes: string[] = [];
    const write = store.setItem.bind(store);
    store.setItem = (key, value) => {
      if (key === STORAGE_KEY) writes.push(value);
      write(key, value);
    };
    game.save({ ...blankInput(), yards: 5 });
    assert.equal(writes.length, 1);
    const saved = JSON.parse(writes[0]!);
    assert.equal(saved.override, null);
    assert.equal(saved.plays.at(-1).after.ball, 45);
  } finally {
    stop();
  }
});
test("actual composable preserves unreadable originals until explicit replacement", async () => {
  const store = new MemoryStore();
  store.setItem(STORAGE_KEY, "{broken");
  const { game, stop } = await gameHarness(store);
  try {
    assert.equal(game.recoveryData.value, "{broken");
    game.club.value.name = "Changed in memory";
    assert.equal(store.getItem(STORAGE_KEY), "{broken");
    assert.equal(game.retrySave(), false);
    game.reset();
    assert.equal(store.getItem(RECOVERY_KEY), "{broken");
    assert.equal(game.isDemo.value, false);
    assert.equal(game.storageError.value, "");
    assert.equal(game.plays.value.length, 0);
  } finally {
    stop();
  }
});
test("actual composable keeps edits exportable after storage failure and retries later", async () => {
  const { game, store, stop } = await gameHarness();
  try {
    store.failKey = STORAGE_KEY;
    game.club.value.name = "New club";
    assert.match(game.storageError.value, /nicht speichern/);
    assert.equal(JSON.parse(game.exportSnapshot()).club.name, "New club");
    store.failKey = "";
    assert.equal(game.retrySave(), true);
    assert.equal(game.storageError.value, "");
    assert.equal(JSON.parse(store.getItem(STORAGE_KEY)!).club.name, "New club");
  } finally {
    stop();
  }
});
test("restore quota failure leaves reactive game and persisted original intact", async () => {
  const { game, store, stop } = await gameHarness();
  try {
    game.retrySave();
    const before = game.exportSnapshot();
    const storedBefore = store.getItem(STORAGE_KEY);
    store.failKey = STORAGE_KEY;
    assert.throws(
      () =>
        game.restore(
          JSON.stringify({ ...snapshot(), plays: [], isDemo: false }),
        ),
      /fehlgeschlagen/,
    );
    assert.equal(game.exportSnapshot(), before);
    assert.equal(store.getItem(STORAGE_KEY), storedBefore);
  } finally {
    stop();
  }
});
test("reset and demo replacement clear revision history while preserving the prior game backup", async () => {
  const { game, stop } = await gameHarness();
  try {
    const last = game.plays.value.at(-1)!;
    game.correct(
      last.id,
      { ...last, yards: last.yards + 1 },
      "Measured correction",
    );
    assert.equal(game.revisions.value.length, 1);
    game.reset();
    assert.equal(game.revisions.value.length, 0);
    assert.equal(game.isDemo.value, false);
    assert.equal(JSON.parse(game.previousBackup.value!).revisions.length, 1);
    game.loadDemo();
    assert.equal(game.isDemo.value, true);
    assert.equal(game.plays.value.length, 30);
    assert.equal(JSON.parse(game.previousBackup.value!).isDemo, false);
  } finally {
    stop();
  }
});

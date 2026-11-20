import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPlay,
  blankInput,
  initialState,
  makeDemo,
  teamStats,
  filterHalf,
  defensiveCredits,
  type PlayInput,
} from "../shared/game";
const input = (extra: Partial<PlayInput> = {}) => ({
  ...blankInput(),
  ...extra,
});
test("normal gain advances ball and remaining distance", () => {
  const p = applyPlay(initialState(), input({ yards: 5 }));
  assert.equal(p.after.ball, 30);
  assert.equal(p.after.down, 2);
  assert.equal(p.after.distance, 5);
});
test("first down resets chain", () => {
  const p = applyPlay(initialState(), input({ yards: 12 }));
  assert.equal(p.firstDown, true);
  assert.equal(p.after.down, 1);
  assert.equal(p.after.distance, 10);
});
test("incomplete pass gains no yards and counts attempt", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "pass", yards: 15, result: "incomplete" }),
  );
  const s = teamStats([p], "home");
  assert.equal(p.after.ball, 25);
  assert.equal(s.attempts, 1);
  assert.equal(s.completions, 0);
  assert.equal(s.yards, 0);
});
test("NCAA sack belongs to rushing and not passing", () => {
  const p = applyPlay(initialState(), input({ kind: "sack", yards: -7 }));
  const s = teamStats([p], "home");
  assert.equal(s.rushYards, -7);
  assert.equal(s.rushAttempts, 1);
  assert.equal(s.attempts, 0);
  assert.equal(p.after.distance, 17);
});
test("failed fourth down changes possession and flips spot", () => {
  const p = applyPlay(
    { ...initialState(), down: 4, distance: 5, ball: 60 },
    input({ yards: 3 }),
  );
  assert.equal(p.after.possession, "away");
  assert.equal(p.after.ball, 37);
  assert.equal(p.after.down, 1);
});
test("interception has zero passing yards and explicit final return spot", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "pass", result: "interception", yards: 10, returnSpot: 38 }),
  );
  assert.equal(p.after.ball, 38);
  assert.equal(p.after.possession, "away");
  assert.equal(teamStats([p], "home").interceptions, 1);
  assert.equal(p.yards, 0);
});
test("fumble lost does not award first down despite gained yardage", () => {
  const p = applyPlay(
    initialState(),
    input({ yards: 15, result: "fumble", returnSpot: 60 }),
  );
  assert.equal(p.firstDown, false);
  assert.equal(p.after.possession, "away");
  assert.equal(teamStats([p], "home").rushYards, 15);
});
test("touchdown followed by PAT and kickoff advances phases", () => {
  const td = applyPlay(
    { ...initialState(), ball: 95, distance: 5, goalToGo: true },
    input({ yards: 5 }),
  );
  assert.equal(td.after.home, 6);
  assert.equal(td.after.phase, "try");
  assert.equal(td.firstDown, false);
  const pat = applyPlay(td.after, input({ kind: "pat", result: "good" }));
  assert.equal(pat.after.home, 7);
  assert.equal(pat.after.phase, "kickoff");
  const kick = applyPlay(
    pat.after,
    input({ kind: "kickoff", result: "touchback" }),
  );
  assert.equal(kick.after.possession, "away");
  assert.equal(kick.after.ball, 25);
});
test("touchdown on a series beginning ten yards out earns first down", () => {
  const p = applyPlay(
    { ...initialState(), ball: 90, distance: 10 },
    input({ yards: 10 }),
  );
  assert.equal(p.firstDown, true);
});
test("safety credits defense and leaves conceding team to kick", () => {
  const p = applyPlay(
    { ...initialState(), ball: 5 },
    input({ kind: "sack", yards: -5 }),
  );
  assert.equal(p.after.away, 2);
  assert.equal(p.after.phase, "kickoff");
  assert.equal(p.after.possession, "home");
});
test("penalty-only play leaves offensive yardage and attempts untouched", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "penalty", yards: 5, penaltyTeam: "home" }),
  );
  assert.equal(p.after.ball, 20);
  assert.equal(p.after.down, 1);
  const s = teamStats([p], "home");
  assert.equal(s.yards, 0);
  assert.equal(s.plays, 0);
  assert.equal(s.penaltyYards, 5);
  assert.equal(s.firstDowns, 0);
});
test("penalty first down is excluded from third down efficiency", () => {
  const p = applyPlay(
    { ...initialState(), down: 3 },
    input({
      kind: "penalty",
      yards: 15,
      penaltyTeam: "away",
      penaltyMode: "first",
    }),
  );
  const s = teamStats([p], "home");
  assert.equal(s.thirdAttempts, 0);
  assert.equal(s.firstDowns, 1);
});
test("red zone counts once per possession and never for a long scoring play alone", () => {
  const long = applyPlay(initialState(), input({ yards: 75 }));
  assert.equal(teamStats([long], "home").redzone, 0);
  const a = applyPlay({ ...initialState(), ball: 82 }, input({ yards: 3 }));
  const b = applyPlay(a.after, input({ yards: 15 }));
  const stats = teamStats([a, b], "home");
  assert.equal(stats.redzone, 1);
  assert.equal(stats.redzoneScored, 1);
});
test("punt touchback is own 20 and cannot be used during a try", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "punt", yards: 40, result: "touchback" }),
  );
  assert.equal(p.after.ball, 20);
  assert.throws(() =>
    applyPlay({ ...initialState(), phase: "try" }, input({ kind: "punt" })),
  );
});
test("invalid yardage and game clock rejected", () => {
  for (const yards of [NaN, 1.5, 76, -26])
    assert.throws(() => applyPlay(initialState(), input({ yards })));
  assert.throws(() => applyPlay(initialState(), input({ elapsed: 901 })));
  assert.throws(() =>
    applyPlay(initialState(), input({ kind: "sack", yards: 5 })),
  );
});
test("third down touchdown is a conversion", () => {
  const p = applyPlay(
    { ...initialState(), ball: 95, down: 3, distance: 5, goalToGo: true },
    input({ yards: 5 }),
  );
  const s = teamStats([p], "home");
  assert.equal(s.thirdAttempts, 1);
  assert.equal(s.thirdMade, 1);
});
test("NCAA efficiency formula from published example", () => {
  const plays = Array.from({ length: 166 }, (_, i) =>
    applyPlay(
      { ...initialState(), ball: i < 16 ? 90 : 25 },
      input({
        kind: "pass",
        yards: i < 16 ? 10 : i < 97 ? 17 : i === 97 ? 30 : 0,
        result: i < 98 ? "normal" : i < 105 ? "interception" : "incomplete",
      }),
    ),
  );
  const s = teamStats(plays, "home");
  assert.equal(s.completions, 98);
  assert.equal(s.passYards, 1567);
  assert.equal(s.rating, "161.7");
});
test("seed ledger consistently produces 14–7", () => {
  const plays = makeDemo();
  assert.equal(plays.at(-1)?.after.home, 14);
  assert.equal(plays.at(-1)?.after.away, 7);
  for (let i = 1; i < plays.length; i++)
    assert.deepEqual(plays[i]!.before, plays[i - 1]!.after);
});
test("conversion after a touchdown at 00:00 is still allowed", () => {
  const td = applyPlay(
    { ...initialState(), clock: 3, ball: 95, distance: 5, goalToGo: true },
    input({ yards: 5, elapsed: 3 }),
  );
  const pat = applyPlay(td.after, input({ kind: "pat", result: "good" }));
  assert.equal(pat.after.home, 7);
  assert.equal(pat.after.clock, 0);
  assert.throws(() => applyPlay(pat.after, input({ kind: "kickoff" })));
});
test("fumble recovered by offense keeps possession and awards first down", () => {
  const p = applyPlay(
    initialState(),
    input({ yards: 12, result: "fumble-kept" }),
  );
  assert.equal(p.firstDown, true);
  assert.equal(p.after.possession, "home");
  assert.equal(teamStats([p], "home").turnovers, 0);
  assert.equal(teamStats([p], "home").fumbles, 1);
});

test("halftime filters all derived statistics through the same event set", () => {
  const a = applyPlay(initialState(), input({ yards: 5 }));
  const b = applyPlay({ ...initialState(), quarter: 3 }, input({ yards: 12 }));
  assert.equal(teamStats(filterHalf([a, b], "first"), "home").yards, 5);
  assert.equal(teamStats(filterHalf([a, b], "second"), "home").yards, 12);
  assert.equal(teamStats(filterHalf([a, b], "all"), "home").yards, 17);
});
test("shared sack credits two assists and half a sack and TFL each", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "sack", yards: -6, tackler: "44", assist: "52" }),
  );
  const a = defensiveCredits([p], "away", "44"),
    b = defensiveCredits([p], "away", "52");
  assert.equal(a.solo, 0);
  assert.equal(a.assists, 1);
  assert.equal(a.sacks, 0.5);
  assert.equal(a.tfl, 0.5);
  assert.equal(b.assists, 1);
  assert.equal(b.sacks, 0.5);
});
test("defense interception and forced fumble credits are player-specific", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "pass", result: "interception", interceptor: "44" }),
  );
  assert.equal(defensiveCredits([p], "away", "44").interceptions, 1);
  assert.equal(defensiveCredits([p], "away", "52").interceptions, 0);
  const f = applyPlay(
    initialState(),
    input({ result: "fumble", yards: 3, forcedBy: "52", recoveredBy: "44" }),
  );
  assert.equal(defensiveCredits([f], "away", "52").forced, 1);
  assert.equal(defensiveCredits([f], "away", "44").recoveries, 1);
});

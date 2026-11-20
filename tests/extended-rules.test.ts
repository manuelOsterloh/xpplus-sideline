import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPlay,
  blankInput,
  initialState,
  startOvertime,
  takeTimeout,
  nextPeriod,
  teamStats,
  filterHalf,
  individualYards,
  defensiveCredits,
  type Penalty,
  type PlayInput,
  type State,
} from "../shared/game";
const input = (x: Partial<PlayInput> = {}) => ({ ...blankInput(), ...x });
const foul = (x: Partial<Penalty> = {}): Penalty => ({
  name: "Holding",
  team: "home",
  status: "accepted",
  timing: "live",
  spot: "previous",
  foulSpot: 25,
  yards: 10,
  halfDistance: false,
  mode: "repeat",
  keepStats: false,
  safety: false,
  ...x,
});
const ot = () =>
  startOvertime({ ...initialState(), quarter: 4, clock: 0 }, "home");
const fieldgoal = (s: State, result: PlayInput["result"] = "missed") =>
  applyPlay(s, input({ kind: "fieldgoal", yards: 42, result }));
test("OT requires a completed tied regulation and preserves the toss choice", () => {
  assert.throws(() => startOvertime(initialState(), "home"));
  assert.throws(() =>
    startOvertime({ ...initialState(), quarter: 4, clock: 0, home: 3 }, "home"),
  );
  assert.throws(() =>
    startOvertime(
      { ...initialState(), quarter: 4, clock: 0, phase: "try" },
      "home",
    ),
  );
  const s = ot();
  assert.equal(s.ball, 75);
  assert.equal(s.clock, 0);
  assert.equal(s.overtime?.series, 1);
});
test("OT first FG starts second possession and second failure ends game", () => {
  const a = fieldgoal(ot(), "good");
  assert.equal(a.after.home, 3);
  assert.equal(a.after.possession, "away");
  assert.equal(a.after.ball, 75);
  const b = fieldgoal(a.after);
  assert.equal(b.after.ended, true);
});
test("OT ties alternate first possession; OT2 prohibits PAT", () => {
  let s = fieldgoal(fieldgoal(ot()).after).after;
  assert.equal(s.overtime?.round, 2);
  assert.equal(s.possession, "away");
  s = applyPlay(s, input({ yards: 25 })).after;
  assert.equal(s.phase, "try");
  assert.throws(() => applyPlay(s, input({ kind: "pat", result: "good" })));
  s = applyPlay(s, input({ kind: "two", result: "good" })).after;
  assert.equal(s.away, 8);
  assert.equal(s.possession, "home");
});
test("OT3 starts at the 3, counts no normal offensive yards, and can continue to OT4", () => {
  let s = ot();
  for (let i = 0; i < 4; i++) s = fieldgoal(s).after;
  assert.equal(s.overtime?.round, 3);
  assert.equal(s.ball, 97);
  assert.equal(s.phase, "try");
  const a = applyPlay(s, input({ kind: "two", result: "good" }));
  const b = applyPlay(a.after, input({ kind: "two", result: "good" }));
  assert.equal(b.after.overtime?.round, 4);
  assert.equal(teamStats([a, b], "home").plays, 0);
  assert.equal(filterHalf([a, b], "second").length, 0);
  assert.equal(filterHalf([a, b], "ot").length, 2);
});
test("OT3 timeout is shared across subsequent periods", () => {
  let s = ot();
  for (let i = 0; i < 4; i++) s = fieldgoal(s).after;
  s = takeTimeout(s, "home");
  s = applyPlay(s, input({ kind: "two", result: "missed" })).after;
  s = applyPlay(s, input({ kind: "two", result: "missed" })).after;
  assert.equal(s.timeouts?.home, 0);
  assert.throws(() => takeTimeout(s, "home"));
});
test("OT walk-off TD omits needless try", () => {
  const s = fieldgoal(ot()).after;
  const p = applyPlay(s, input({ yards: 25 }));
  assert.equal(p.after.ended, true);
  assert.equal(p.after.away, 6);
});
test("OT interception return for TD ends first series immediately", () => {
  const p = applyPlay(
    ot(),
    input({
      kind: "pass",
      result: "interception",
      returns: [
        {
          team: "away",
          player: "44",
          type: "interception",
          from: 5,
          to: 100,
          fumbled: false,
        },
      ],
    }),
  );
  assert.equal(p.after.ended, true);
  assert.equal(p.after.away, 6);
  assert.equal(p.after.home, 0);
});
test("OT accepted loss of down on fourth down ends series", () => {
  const p = applyPlay(
    { ...ot(), down: 4 },
    input({ kind: "penalty", penalties: [foul({ mode: "loss" })] }),
  );
  assert.equal(p.after.possession, "away");
  assert.equal(p.after.overtime?.series, 2);
});
test("offsetting penalties erase TD and all offense stats", () => {
  const p = applyPlay(
    { ...initialState(), ball: 90 },
    input({ yards: 10, penalties: [foul({ status: "offsetting" })] }),
  );
  assert.equal(p.after.home, 0);
  assert.equal(p.after.ball, 90);
  assert.equal(p.after.down, 1);
  assert.equal(teamStats([p], "home").plays, 0);
  assert.equal(teamStats([p], "home").penaltyCount, 0);
});
test("declined foul retains TD and no penalty yardage", () => {
  const p = applyPlay(
    { ...initialState(), ball: 90 },
    input({ yards: 10, penalties: [foul({ status: "declined" })] }),
  );
  assert.equal(p.after.home, 6);
  assert.equal(teamStats([p], "home").yards, 10);
  assert.equal(teamStats([p], "home").penaltyCount, 0);
});
test("previous spot accepted holding nullifies pass attempt", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "pass", yards: 17, penalties: [foul()] }),
  );
  assert.equal(p.after.ball, 15);
  assert.equal(p.after.down, 1);
  assert.equal(p.after.distance, 20);
  assert.equal(teamStats([p], "home").attempts, 0);
});
test("roughing after completed first down credits pass and penalty first downs", () => {
  const p = applyPlay(
    { ...initialState(), ball: 55, down: 2, distance: 8 },
    input({
      kind: "pass",
      yards: 15,
      penalties: [
        foul({
          team: "away",
          spot: "end",
          mode: "first",
          keepStats: true,
          yards: 15,
        }),
      ],
    }),
  );
  assert.equal(p.after.ball, 85);
  assert.equal(teamStats([p], "home").passYards, 15);
  assert.equal(teamStats([p], "home").firstDowns, 2);
});
test("live foul at spot retains legal progress and repeats down", () => {
  const p = applyPlay(
    { ...initialState(), ball: 40 },
    input({
      yards: 17,
      penalties: [
        foul({ spot: "foul", foulSpot: 57, keepStats: true, yards: 15 }),
      ],
    }),
  );
  assert.equal(p.after.ball, 42);
  assert.equal(p.after.down, 1);
  assert.equal(teamStats([p], "home").rushYards, 17);
  assert.equal(p.firstDown, false);
});
test("dead-ball foul after first down keeps new series", () => {
  const p = applyPlay(
    initialState(),
    input({
      yards: 12,
      penalties: [
        foul({ timing: "dead", spot: "end", mode: "next", yards: 15 }),
      ],
    }),
  );
  assert.equal(p.after.ball, 22);
  assert.equal(p.after.down, 1);
  assert.equal(p.after.distance, 25);
  assert.equal(teamStats([p], "home").yards, 12);
});
test("half distance uses actual enforcement yards", () => {
  const p = applyPlay(
    { ...initialState(), ball: 90 },
    input({
      kind: "penalty",
      penalties: [
        foul({ team: "away", halfDistance: true, mode: "first", yards: 15 }),
      ],
    }),
  );
  assert.equal(p.after.ball, 95);
  assert.equal(teamStats([p], "away").penaltyYards, 5);
});
test("untimed down explicitly extends expired quarter", () => {
  const p = applyPlay(
    { ...initialState(), clock: 1 },
    input({ elapsed: 1, penalties: [foul()], untimedAfter: true }),
  );
  assert.equal(p.after.untimed, true);
  const next = applyPlay(p.after, input({ yards: 2 }));
  assert.equal(next.after.untimed, false);
  assert.throws(() => applyPlay(next.after, input()));
});
test("conversion penalty retries without offensive stats", () => {
  const p = applyPlay(
    { ...initialState(), phase: "try", ball: 97 },
    input({ kind: "penalty", penalties: [foul({ yards: 5 })] }),
  );
  assert.equal(p.after.phase, "try");
  assert.equal(p.after.ball, 92);
  assert.equal(teamStats([p], "home").plays, 0);
});
test("conversion returns and one-point safeties affect score only", () => {
  const s = { ...initialState(), phase: "try" as const, ball: 97 };
  assert.equal(
    applyPlay(s, input({ kind: "two", result: "defensive-two" })).after.away,
    2,
  );
  assert.equal(
    applyPlay(s, input({ kind: "pat", result: "safety-one" })).after.away,
    1,
  );
  assert.equal(
    applyPlay(s, input({ kind: "two", result: "offensive-safety-one" })).after
      .home,
    1,
  );
});
test("grounding is a team rush, loss of down, no pass or sack", () => {
  const p = applyPlay(initialState(), input({ kind: "grounding", yards: -7 }));
  const stats = teamStats([p], "home");
  assert.equal(p.after.down, 2);
  assert.equal(p.after.distance, 17);
  assert.equal(stats.rushYards, -7);
  assert.equal(stats.attempts, 0);
  assert.equal(stats.sacks, 0);
  assert.equal(stats.penaltyYards, 0);
  assert.equal(p.player, "");
});
test("bad snap is a team rush and fumble without sack", () => {
  const p = applyPlay(initialState(), input({ kind: "wildsnap", yards: -8 }));
  assert.equal(teamStats([p], "home").fumbles, 1);
  assert.equal(teamStats([p], "home").sacks, 0);
});
test("fair catch on kickoff inside 25 starts at 25, punt stays at catch", () => {
  assert.equal(
    applyPlay(
      { ...initialState(), phase: "kickoff" },
      input({ kind: "kickoff", result: "faircatch", fairCatchSpot: 8 }),
    ).after.ball,
    25,
  );
  assert.equal(
    applyPlay(
      initialState(),
      input({
        kind: "punt",
        yards: 60,
        result: "faircatch",
        fairCatchSpot: 15,
      }),
    ).after.ball,
    15,
  );
});
test("free kick touchback after safety starts at 20", () => {
  const s = applyPlay(
    { ...initialState(), ball: 5 },
    input({ yards: -5 }),
  ).after;
  assert.equal(
    applyPlay(s, input({ kind: "kickoff", result: "touchback" })).after.ball,
    20,
  );
});
test("onside kicking recovery keeps ball with a new series", () => {
  const p = applyPlay(
    { ...initialState(), phase: "kickoff" },
    input({
      kind: "kickoff",
      result: "onside",
      recoveryTeam: "home",
      returnSpot: 48,
    }),
  );
  assert.equal(p.after.possession, "home");
  assert.equal(p.after.ball, 48);
  assert.equal(p.after.down, 1);
});
test("return TD uses returning team and no passing TD", () => {
  const p = applyPlay(
    initialState(),
    input({
      kind: "pass",
      yards: 12,
      result: "fumble",
      returns: [
        {
          team: "away",
          player: "44",
          type: "fumble",
          from: 63,
          to: 100,
          fumbled: false,
        },
      ],
    }),
  );
  assert.equal(p.after.away, 6);
  assert.equal(p.after.possession, "away");
  assert.equal(teamStats([p], "home").rating, "200.8");
  assert.equal(teamStats([p], "away").fumbleReturnYards, 37);
});
test("return fumble and second recovery use separate team coordinates", () => {
  const p = applyPlay(
    initialState(),
    input({
      kind: "pass",
      result: "interception",
      returns: [
        {
          team: "away",
          player: "44",
          type: "interception",
          from: 20,
          to: 40,
          fumbled: true,
        },
        {
          team: "home",
          player: "81",
          type: "fumble",
          from: 60,
          to: 65,
          fumbled: false,
        },
      ],
    }),
  );
  assert.equal(p.after.possession, "home");
  assert.equal(p.after.ball, 65);
  assert.equal(p.after.down, 1);
  assert.equal(teamStats([p], "away").intReturnYards, 20);
  assert.equal(teamStats([p], "home").fumbleReturnYards, 5);
});
test("discontinuous or unfinished return chains are rejected", () => {
  assert.throws(() =>
    applyPlay(
      initialState(),
      input({
        kind: "pass",
        result: "interception",
        returns: [
          {
            team: "away",
            player: "44",
            type: "interception",
            from: 20,
            to: 40,
            fumbled: true,
          },
        ],
      }),
    ),
  );
});
test("lateral splits receiving yards but does not add a reception", () => {
  const p = applyPlay(
    initialState(),
    input({
      kind: "pass",
      yards: 15,
      target: "81",
      laterals: [{ player: "11", yards: 9 }],
    }),
  );
  assert.equal(individualYards(p, "81"), 6);
  assert.equal(individualYards(p, "11"), 9);
  assert.equal(teamStats([p], "home").completions, 1);
});
test("punt net deducts returns and touchback adjustment", () => {
  const a = applyPlay(
    { ...initialState(), ball: 40 },
    input({
      kind: "punt",
      yards: 45,
      returns: [
        {
          team: "away",
          type: "punt",
          player: "10",
          from: 15,
          to: 25,
          fumbled: false,
        },
      ],
    }),
  );
  const b = applyPlay(
    { ...initialState(), ball: 40 },
    input({ kind: "punt", yards: 60, result: "touchback" }),
  );
  assert.equal(teamStats([a, b], "home").puntNet, "37.5");
  assert.equal(teamStats([a, b], "away").puntReturnYards, 10);
});
test("blocked punt is team entry and blocker receives credit", () => {
  const p = applyPlay(
    initialState(),
    input({ kind: "punt", result: "blocked", yards: 0, blockedBy: "44" }),
  );
  assert.equal(p.puntTeam, true);
  assert.equal(defensiveCredits([p], "away", "44").blocks, 1);
});
test("fumble through opponents end zone awards touchback, not TD", () => {
  const p = applyPlay(
    { ...initialState(), ball: 90 },
    input({ yards: 10, result: "fumble-touchback" }),
  );
  assert.equal(p.after.away, 0);
  assert.equal(p.after.home, 0);
  assert.equal(p.after.ball, 20);
  assert.equal(p.turnover, true);
});
test("half-time resets timeouts and unfinished conversion blocks quarter advance", () => {
  const s = nextPeriod(
    { ...initialState(), quarter: 2, clock: 0, timeouts: { home: 0, away: 1 } },
    12,
  );
  assert.equal(s.clock, 720);
  assert.equal(s.timeouts?.home, 3);
  assert.throws(() =>
    nextPeriod({ ...initialState(), clock: 0, phase: "try" }, 15),
  );
});

test("a return fumble lost is charged to the returning team", () => {
  const p = applyPlay(
    initialState(),
    input({
      kind: "pass",
      result: "interception",
      returns: [
        {
          team: "away",
          player: "44",
          type: "interception",
          from: 20,
          to: 40,
          fumbled: true,
        },
        {
          team: "home",
          player: "81",
          type: "fumble",
          from: 60,
          to: 65,
          fumbled: false,
        },
      ],
    }),
  );
  assert.equal(teamStats([p], "away").turnovers, 1);
  assert.equal(teamStats([p], "away").fumbles, 1);
});
test("OT try with accepted live-ball penalty must be retried, not end possession", () => {
  let s = ot();
  for (let i = 0; i < 4; i++) s = fieldgoal(s).after;
  const p = applyPlay(
    s,
    input({ kind: "two", result: "good", penalties: [foul({ yards: 5 })] }),
  );
  assert.equal(p.after.home, 0);
  assert.equal(p.after.overtime?.series, 1);
  assert.equal(p.after.ball, 92);
  assert.equal(p.after.phase, "try");
});
test("third down interception return TD is not an offensive conversion", () => {
  const p = applyPlay(
    { ...initialState(), down: 3 },
    input({
      kind: "pass",
      result: "interception",
      returns: [
        {
          team: "away",
          player: "44",
          type: "interception",
          from: 30,
          to: 100,
          fumbled: false,
        },
      ],
    }),
  );
  assert.equal(teamStats([p], "home").thirdMade, 0);
});
test("result combinations are validated before scoring", () => {
  assert.throws(() =>
    applyPlay(initialState(), input({ kind: "run", result: "good" })),
  );
});
test("next overtime first offense can follow the captains choice", () => {
  let s = ot();
  s = { ...s, overtime: { ...s.overtime!, nextFirst: "home" } };
  s = fieldgoal(s).after;
  s = fieldgoal(s).after;
  assert.equal(s.overtime?.round, 2);
  assert.equal(s.possession, "home");
  assert.equal(s.overtime?.nextFirst, undefined);
});
test("defensive scoring on the first OT try does not remove the other try", () => {
  let s = ot();
  for (let i = 0; i < 4; i++) s = fieldgoal(s).after;
  const a = applyPlay(s, input({ kind: "two", result: "defensive-two" }));
  assert.equal(a.after.ended, undefined);
  assert.equal(a.after.overtime?.series, 2);
  assert.equal(a.after.away, 2);
  const b = applyPlay(a.after, input({ kind: "two", result: "defensive-two" }));
  assert.equal(b.after.overtime?.round, 4);
  assert.equal(b.after.home, 2);
});
test("missed field goal without return uses previous spot or own twenty", () => {
  const a = applyPlay(
    { ...initialState(), ball: 65 },
    input({ kind: "fieldgoal", yards: 52, result: "missed" }),
  );
  assert.equal(a.after.ball, 35);
  const b = applyPlay(
    { ...initialState(), ball: 90 },
    input({ kind: "fieldgoal", yards: 27, result: "missed" }),
  );
  assert.equal(b.after.ball, 20);
});
test("OT blocked kick recovery behind neutral zone advances only when line to gain reached", () => {
  const s = { ...ot(), down: 2 };
  const a = applyPlay(
    s,
    input({
      kind: "fieldgoal",
      result: "blocked",
      yards: 0,
      recoveryTeam: "home",
      returnSpot: 80,
    }),
  );
  assert.equal(a.after.down, 3);
  assert.equal(a.after.distance, 5);
  assert.equal(a.after.overtime?.series, 1);
  const b = applyPlay(
    s,
    input({
      kind: "fieldgoal",
      result: "blocked",
      yards: 0,
      recoveryTeam: "home",
      returnSpot: 90,
    }),
  );
  assert.equal(b.after.down, 1);
  assert.equal(b.after.ball, 90);
  const c = applyPlay(
    s,
    input({
      kind: "fieldgoal",
      result: "blocked",
      yards: 0,
      recoveryTeam: "home",
      returnSpot: 100,
    }),
  );
  assert.equal(c.after.home, 6);
  assert.equal(c.after.phase, "try");
  assert.equal(c.after.overtime?.series, 1);
});
test("OT kick muff beyond neutral zone recovered by kicker gives new series", () => {
  const p = applyPlay(
    ot(),
    input({
      kind: "fieldgoal",
      result: "muff",
      yards: 42,
      recoveryTeam: "home",
      returnSpot: 97,
    }),
  );
  assert.equal(p.after.possession, "home");
  assert.equal(p.after.ball, 97);
  assert.equal(p.after.down, 1);
  assert.equal(p.after.overtime?.series, 1);
});
const intTD = (penalties: Penalty[]): PlayInput =>
  input({
    kind: "pass",
    result: "interception",
    penalties,
    returns: [
      {
        team: "away",
        type: "interception",
        player: "44",
        from: 20,
        to: 100,
        fumbled: false,
      },
    ],
  });
test("OT return foul cancels TD without replaying down", () => {
  const p = applyPlay(ot(), intTD([foul({ team: "away", afterChange: true })]));
  assert.equal(p.after.away, 0);
  assert.equal(p.after.ended, undefined);
  assert.equal(p.after.overtime?.series, 2);
  assert.equal(p.after.ball, 75);
  assert.equal(p.penalties?.[0]?.status, "declined");
  assert.equal(p.touchdown, false);
});
test("OT flagrant return foul carries to succeeding series", () => {
  const p = applyPlay(
    ot(),
    intTD([
      foul({ team: "away", afterChange: true, carryOver: true, yards: 15 }),
    ]),
  );
  assert.equal(p.after.away, 0);
  assert.equal(p.after.ball, 60);
  assert.equal(p.after.distance, 10);
});
test("OT both foul after defensive possession: no replay; carry exception", () => {
  const p = applyPlay(
    ot(),
    intTD([
      foul({ status: "offsetting" }),
      foul({
        team: "away",
        status: "offsetting",
        afterChange: true,
        carryOver: true,
        yards: 15,
      }),
    ]),
  );
  assert.equal(p.after.overtime?.series, 2);
  assert.equal(p.after.away, 0);
  assert.equal(p.after.ball, 60);
});
test("OT dead-ball foul following failed FG moves next series start", () => {
  const p = applyPlay(
    ot(),
    input({
      kind: "fieldgoal",
      result: "missed",
      yards: 42,
      penalties: [foul({ team: "away", timing: "dead", yards: 15 })],
    }),
  );
  assert.equal(p.after.overtime?.series, 2);
  assert.equal(p.after.ball, 60);
  assert.equal(p.after.distance, 10);
});
test("OT dead-ball penalty within a series preserves the next down", () => {
  const p = applyPlay(
    ot(),
    input({
      kind: "run",
      yards: 2,
      penalties: [
        foul({ team: "home", timing: "dead", spot: "end", yards: 5 }),
      ],
    }),
  );
  assert.equal(p.after.down, 2);
  assert.equal(p.after.ball, 72);
  assert.equal(p.after.distance, 13);
});
test("loss of down on OT try ends the attempt without score", () => {
  let s = ot();
  for (let i = 0; i < 4; i++) s = fieldgoal(s).after;
  const p = applyPlay(
    s,
    input({
      kind: "two",
      result: "good",
      penalties: [foul({ team: s.possession, mode: "loss" })],
    }),
  );
  assert.equal(p.after.home, 0);
  assert.equal(p.after.away, 0);
  assert.equal(p.after.overtime?.series, 2);
});

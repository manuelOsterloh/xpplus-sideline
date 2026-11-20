import test from "node:test";
import assert from "node:assert/strict";
import { applyPlay, blankInput, initialState } from "../shared/game";
import { revisePlay } from "../shared/review";
test("review replays following plays with stable ids and retains quarter boundary", () => {
  const a = applyPlay(initialState(), { ...blankInput(), yards: 2 }, "a");
  const b = applyPlay(
    { ...a.after, quarter: 2, clock: 900 },
    { ...blankInput(), yards: 1 },
    "b",
  );
  const next = revisePlay([a, b], "a", { ...a, yards: 3 });
  assert.equal(next[1]?.after.ball, 29);
  assert.equal(next[1]?.before.quarter, 2);
  assert.equal(next[1]?.id, "b");
  assert.equal(a.after.ball, 27);
});
test("review rejects invalid scoring sequence atomically", () => {
  const a = applyPlay(initialState(), { ...blankInput(), yards: 2 }, "a");
  const b = applyPlay(a.after, { ...blankInput(), yards: 1 }, "b");
  assert.throws(() => revisePlay([a, b], "a", { ...a, yards: 75 }));
  assert.equal(a.after.ball, 27);
});

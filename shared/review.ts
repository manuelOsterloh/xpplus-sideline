import { applyPlay, type Play, type PlayInput, type State } from "./game";
// Preserve explicit between-play corrections (quarter/clock/spot) during replay.
export function carryAdjustments(
  current: State,
  originalAfter: State,
  nextBefore: State,
): State {
  const next = { ...current };
  for (const key of Object.keys(nextBefore) as (keyof State)[]) {
    if (
      JSON.stringify(originalAfter[key]) !== JSON.stringify(nextBefore[key])
    ) {
      (next as unknown as Record<string, unknown>)[key] = nextBefore[key];
    }
  }
  return next;
}
export function revisePlay(
  plays: Play[],
  id: string,
  replacement: PlayInput,
): Play[] {
  const index = plays.findIndex((p) => p.id === id);
  if (index < 0) throw new Error("Play nicht gefunden.");
  const revised = plays.slice(0, index);
  let state = plays[index]!.before;
  for (let i = index; i < plays.length; i++) {
    const original = plays[i]!;
    if (i > index)
      state = carryAdjustments(state, plays[i - 1]!.after, original.before);
    // Never silently reassign an existing following play to the other team.
    if (i > index && state.possession !== original.before.possession)
      throw new Error(
        `Review verändert Ballbesitz vor Play ${i + 1}. Folgeplays zuerst prüfen.`,
      );
    try {
      const play = applyPlay(
        state,
        i === index ? replacement : original,
        original.id,
      );
      revised.push(play);
      state = play.after;
    } catch (e) {
      throw new Error(`Review bei Play ${i + 1}: ${(e as Error).message}`);
    }
  }
  return revised;
}

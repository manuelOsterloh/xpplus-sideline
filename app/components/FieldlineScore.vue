<script setup lang="ts">
import { ChevronDown, ChevronRight } from "@lucide/vue";
import { clockLabel, spotLabel, type State } from "#shared/game";

const props = defineProps<{
  state: State;
  club: {
    name: string;
    short: string;
    logo?: string;
    opponent: string;
    opponentShort: string;
  };
}>();
const emit = defineEmits<{ settings: []; situation: [] }>();

const offense = computed(() =>
  props.state.possession === "home"
    ? props.club.short
    : props.club.opponentShort,
);
const period = computed(() =>
  props.state.overtime
    ? `OT${props.state.overtime.round}`
    : `Q${props.state.quarter}`,
);
const time = computed(() => {
  if (props.state.ended) return "FINAL";
  if (props.state.overtime) return `Serie ${props.state.overtime.series}/2`;
  if (props.state.untimed) return "Ohne Uhr";
  return clockLabel(props.state.clock);
});
const possessionText = computed(() => {
  if (props.state.ended) return "Spiel beendet";
  if (props.state.phase === "kickoff") return `${offense.value} kickt`;
  if (props.state.phase === "try") return `${offense.value} · Conversion`;
  return `${offense.value} am Ball`;
});

// The game engine measures spots from the team in possession's own goal line.
// Keep the attack pointing right, including after turnovers and during overtime.
const lineToGain = computed(() => {
  const { phase, ended, goalToGo, ball, distance } = props.state;
  if (phase !== "scrimmage" || ended) return null;
  return goalToGo ? 100 : Math.min(100, ball + distance);
});
const fieldWindow = computed(() => {
  const ball = props.state.ball;
  const gain = (lineToGain.value ?? ball) - ball;
  const width = Math.min(100, Math.max(48, gain + 12));
  const start = Math.min(
    100 - width,
    Math.max(0, ball - Math.min(21, width - gain - 5)),
  );
  return { start, width };
});
const marks = computed(() => {
  const { start, width } = fieldWindow.value;
  return Array.from(
    { length: Math.floor(start + width) - Math.ceil(start) + 1 },
    (_, i) => Math.ceil(start) + i,
  );
});
function position(yard: number) {
  return 3 + ((yard - fieldWindow.value.start) / fieldWindow.value.width) * 94;
}
const fieldDescription = computed(() => {
  if (props.state.ended)
    return "Letzte Feldposition: " + spotLabel(props.state.ball);
  const first = lineToGain.value;
  return [
    offense.value + " spielt nach rechts",
    "Ball auf " + spotLabel(props.state.ball),
    first === null
      ? ""
      : first === 100
        ? "Ziel: gegnerische Goalline"
        : "First Down auf " + spotLabel(first),
  ]
    .filter(Boolean)
    .join(". ");
});
</script>
<template>
  <section class="fl-score" aria-label="Spielstand">
    <div class="fl-match">
      <div class="fl-matchup">
        <img v-if="club.logo" :src="club.logo" alt="" />
        <span>{{ club.name }} gegen {{ club.opponent }}</span>
      </div>
      <div class="fl-points">
        <button
          class="fl-team"
          :aria-label="club.name + ' · Club bearbeiten'"
          @click="emit('settings')"
        >
          {{ club.short }}
        </button>
        <button
          class="fl-value"
          aria-label="Heimspielstand bearbeiten"
          @click="emit('situation')"
        >
          {{ state.home }}
        </button>
        <span class="fl-colon" aria-hidden="true">:</span>
        <button
          class="fl-value"
          aria-label="Gastspielstand bearbeiten"
          @click="emit('situation')"
        >
          {{ state.away }}
        </button>
        <button
          class="fl-team"
          :aria-label="club.opponent + ' · Gegner bearbeiten'"
          @click="emit('settings')"
        >
          {{ club.opponentShort }}
        </button>
      </div>
      <div class="fl-status">
        <button class="fl-clock" @click="emit('situation')">
          {{ period }} <span>·</span> {{ time }} <ChevronDown :size="14" />
        </button>
        <span class="fl-possession"
          >{{ possessionText }} <ChevronRight v-if="!state.ended" :size="14"
        /></span>
      </div>
    </div>
    <div
      class="fl-pitch"
      :style="{ '--five-yards': 470 / fieldWindow.width + '%' }"
      role="img"
      :aria-label="fieldDescription"
    >
      <span class="fl-pitch-label" aria-hidden="true">Ballposition</span>
      <span
        v-for="yard in marks"
        :key="yard"
        class="fl-mark"
        :class="{ 'fl-major': yard % 10 === 0 }"
        :style="{ left: position(yard) + '%' }"
        aria-hidden="true"
      >
        <span
          v-if="yard % 10 === 0 && position(yard) > 4 && position(yard) < 96"
          class="fl-number"
          >{{ Math.min(yard, 100 - yard) || "G" }}</span
        >
      </span>
      <div
        v-if="lineToGain !== null"
        class="fl-gain"
        :style="{ left: position(lineToGain) + '%' }"
        aria-hidden="true"
      ></div>
      <div
        class="fl-ball"
        :style="{ left: position(state.ball) + '%' }"
        aria-hidden="true"
      >
        <span><ChevronRight :size="20" :stroke-width="4" /></span>
      </div>
    </div>
  </section>
</template>
<style scoped>
.fl-score {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
  overflow: hidden;
  border-radius: 14px;
  background: var(--club-primary);
  color: var(--on-primary);
  isolation: isolate;
}
.fl-match {
  min-width: 0;
  padding: 12px 22px 4px;
}
.fl-matchup,
.fl-pitch-label {
  font:
    700 11px/1.2 "DM Sans",
    sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.105em;
}
.fl-matchup {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 19px;
}
.fl-matchup img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex: none;
}
.fl-matchup span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.fl-score button {
  border: 0;
  background: transparent;
  color: inherit;
  border-radius: 5px;
  min-height: 44px;
  padding: 0;
}
.fl-score button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
@media (hover: hover) {
  .fl-score button:hover {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
}
.fl-points {
  display: flex;
  align-items: center;
  gap: 6px;
  width: max-content;
  max-width: 100%;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
}
.fl-score .fl-team {
  min-width: 44px;
  font: inherit;
  font-size: clamp(21px, 2.9vw, 32px);
  white-space: nowrap;
}
.fl-score .fl-value {
  min-width: 44px;
  font: inherit;
  font-size: clamp(42px, 5.7vw, 66px);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.fl-colon {
  font-size: 32px;
}
.fl-status,
.fl-clock,
.fl-possession {
  display: flex;
  align-items: center;
}
.fl-status {
  flex-wrap: wrap;
  gap: 0 9px;
  font-size: 13px;
  font-weight: 700;
}
.fl-score .fl-clock {
  font: inherit;
  gap: 5px;
}
.fl-clock span {
  opacity: 0.7;
}
.fl-possession {
  gap: 2px;
  border-inline-start: 1px solid currentColor;
  padding-inline-start: 9px;
}
.fl-pitch {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-inline-start: 1px solid
    color-mix(in srgb, var(--on-primary) 35%, transparent);
  background: color-mix(in srgb, var(--club-primary) 91%, var(--on-primary));
}
.fl-pitch::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to right,
    transparent 0 var(--five-yards),
    color-mix(in srgb, var(--on-primary) 4%, transparent) var(--five-yards)
      calc(var(--five-yards) * 2)
  );
}
.fl-pitch-label {
  position: absolute;
  left: 14px;
  top: 12px;
  z-index: 1;
  text-shadow: 0 1px var(--club-primary);
}
.fl-mark {
  position: absolute;
  inset-block: 0;
  width: 1px;
}
.fl-mark::before,
.fl-mark::after {
  content: "";
  position: absolute;
  width: 1px;
  height: 6px;
  background: currentColor;
  opacity: 0.48;
}
.fl-mark::before {
  top: 36%;
}
.fl-mark::after {
  bottom: 31%;
}
.fl-major {
  background: color-mix(in srgb, var(--on-primary) 36%, transparent);
}
.fl-number {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font:
    700 22px/1.1 "Barlow Condensed",
    sans-serif;
}
.fl-gain,
.fl-ball {
  position: absolute;
  inset-block: 0;
}
.fl-gain {
  border-left: 3px dashed #ffd36a;
  filter: drop-shadow(0 0 1px #29280d);
}
.fl-ball {
  border-left: 2px solid var(--on-primary);
}
.fl-ball span {
  position: absolute;
  top: 50%;
  left: -1px;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 2px solid var(--club-primary);
  border-radius: 50%;
  background: var(--club-secondary);
  color: var(--on-secondary);
  box-shadow: 0 0 0 1px var(--on-primary);
}
@media (max-width: 680px) {
  .fl-score {
    grid-template-columns: minmax(0, 1.14fr) minmax(0, 1fr);
    border-radius: 10px;
  }
  .fl-match {
    padding: 7px 8px 4px;
  }
  .fl-score .fl-value {
    font-size: 36px;
  }
  .fl-points {
    gap: 2px;
  }
  .fl-status {
    font-size: 12px;
  }
}
@media (max-width: 540px) {
  .fl-score {
    grid-template-columns: 1fr;
  }
  .fl-match {
    padding: 8px 12px 0;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 1px 8px;
  }
  .fl-matchup {
    grid-column: 1/-1;
    font-size: 10px;
  }
  .fl-points {
    gap: 0;
  }
  .fl-status {
    justify-content: flex-end;
    gap: 0;
    flex-direction: column;
    align-items: flex-end;
  }
  .fl-possession {
    padding: 0 0 4px;
    border: 0;
    font-size: 11px;
  }
  .fl-pitch {
    min-height: 57px;
    border: 0;
    border-top: 1px solid color-mix(in srgb, var(--on-primary) 30%, transparent);
  }
  .fl-pitch-label {
    left: 7px;
    top: 3px;
    font-size: 9px;
  }
  .fl-number {
    font-size: 14px;
    bottom: 0;
  }
}
@media (max-width: 370px) {
  .fl-status {
    grid-column: 1/-1;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
  }
  .fl-possession {
    padding: 0;
  }
}
</style>

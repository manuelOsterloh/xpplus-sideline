<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import { spotLabel } from "#shared/game";
const props = defineProps<{
  ball: number;
  distance: number;
  team: string;
  opponent: string;
  gain: number;
}>();
const emit = defineEmits<{ spot: [number] }>();
const end = computed(() => Math.min(100, Math.max(0, props.ball + props.gain)));
const endpoint = computed(() =>
  end.value === 100
    ? "Gegnerische Goalline"
    : end.value === 0
      ? "Eigene Goalline"
      : spotLabel(end.value),
);
function choose(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  emit(
    "spot",
    Math.round(
      Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
      ),
    ),
  );
}
</script>
<template>
  <div class="field-topline">
    <span><span class="tiny-dot"></span> {{ team }} IN BALLBESITZ</span
    ><span>ANGRIFFSRICHTUNG <ArrowRight :size="15" /></span>
  </div>
  <div class="football-field">
    <div class="endzone">
      <span>{{ team }}</span>
    </div>
    <div
      class="playing-field"
      role="slider"
      tabindex="0"
      aria-label="Spielzug-Endpunkt in Yards ab eigener Goalline"
      :aria-valuenow="end"
      :aria-valuetext="`${endpoint}, ${gain > 0 ? '+' : ''}${gain} Yards`"
      :aria-valuemin="0"
      :aria-valuemax="100"
      aria-orientation="horizontal"
      @keydown.right.prevent="emit('spot', Math.min(100, end + 1))"
      @keydown.left.prevent="emit('spot', Math.max(0, end - 1))"
      @keydown.up.prevent="emit('spot', Math.min(100, end + 1))"
      @keydown.down.prevent="emit('spot', Math.max(0, end - 1))"
      @keydown.home.prevent="emit('spot', 0)"
      @keydown.end.prevent="emit('spot', 100)"
      @keydown.page-up.prevent="emit('spot', Math.min(100, end + 10))"
      @keydown.page-down.prevent="emit('spot', Math.max(0, end - 10))"
      @click="choose"
    >
      <div
        v-for="n in 9"
        :key="n"
        class="yardline"
        :style="{ left: `${n * 10}%` }"
      >
        <span>{{ n <= 5 ? n * 10 : (10 - n) * 10 }}</span
        ><span>{{ n <= 5 ? n * 10 : (10 - n) * 10 }}</span>
      </div>
      <div class="hashmarks upper"></div>
      <div class="hashmarks lower"></div>
      <div
        class="first-line"
        :style="{ left: `${Math.min(100, ball + distance)}%` }"
      ></div>
      <div class="scrimmage-line" :style="{ left: `${ball}%` }">
        <span class="ball-marker">◆</span>
      </div>
      <div
        v-if="gain !== 0"
        class="gain-line"
        :style="{
          left: `${Math.min(ball, end)}%`,
          width: `${Math.abs(end - ball)}%`,
        }"
      >
        <span :style="{ left: gain < 0 ? '0' : '100%' }"
          >{{ gain > 0 ? "+" : "" }}{{ gain }}</span
        >
      </div>
      <span class="field-center-word">SIDELINE</span>
    </div>
    <div class="endzone right">
      <span>{{ opponent }}</span>
    </div>
  </div>
  <div class="field-legend">
    <span><i class="line-key"></i> Ball auf {{ spotLabel(ball) }}</span
    ><span><i class="line-key first"></i> First-down-Linie</span
    ><span class="field-hint">Endpunkt antippen → Yards übernehmen</span>
  </div>
</template>

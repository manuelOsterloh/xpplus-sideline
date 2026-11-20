<script setup lang="ts">
import { ChevronDown, Check } from "@lucide/vue";
const props = defineProps<{
  modelValue: string;
  players: { number: string; name: string; position: string }[];
  label: string;
  preferred?: string[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const choices = computed(() => {
  const sorted = [...props.players].sort((a, b) => {
    const rank = (p: typeof a) => {
      const n = (props.preferred || []).indexOf(p.position);
      return n < 0 ? 100 : n;
    };
    return rank(a) - rank(b);
  });
  const first = sorted.slice(0, 3);
  const selected = props.players.find((p) => p.number === props.modelValue);
  if (selected && !first.some((p) => p.number === selected.number))
    first[2] = selected;
  return first;
});
</script>
<template>
  <div class="quick-player" role="group" :aria-label="label">
    <button
      v-for="p in choices"
      :key="p.number"
      type="button"
      class="player-tile"
      :class="{ selected: modelValue === p.number }"
      :aria-pressed="modelValue === p.number"
      :aria-label="`${label}: ${p.name}, Nummer ${p.number}, ${p.position}`"
      @click="emit('update:modelValue', p.number)"
    >
      <strong>#{{ p.number }}</strong
      ><span>{{ p.name.split(" ").at(-1) }}</span
      ><Check v-if="modelValue === p.number" :size="12" />
    </button>
    <div class="player-more">
      <span
        >{{ modelValue ? "Alle" : "Offen" }} <ChevronDown :size="14"
      /></span>
      <select
        :aria-label="label"
        :value="modelValue"
        @change="
          emit('update:modelValue', ($event.target as HTMLSelectElement).value)
        "
      >
        <option value="">Noch offen</option>
        <option v-for="p in players" :key="p.number" :value="p.number">
          #{{ p.number }} · {{ p.name }} · {{ p.position }}
        </option>
      </select>
    </div>
  </div>
</template>

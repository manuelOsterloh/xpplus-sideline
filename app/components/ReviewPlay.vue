<script setup lang="ts">
import { X } from "@lucide/vue";
import {
  blankInput,
  labels,
  applyPlay,
  spotLabel,
  type Kind,
  type Play,
  type PlayInput,
} from "#shared/game";
const props = defineProps<{
  play: Play;
  roster: { number: string; name: string; team: string }[];
  home: string;
  away: string;
}>();
const emit = defineEmits<{
  close: [];
  save: [input: PlayInput, reason: string];
}>();
const draft = reactive<PlayInput>({
  ...blankInput(),
  ...JSON.parse(JSON.stringify(props.play)),
});
const reason = ref("");
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
const resultLabels: Record<PlayInput["result"], string> = {
  normal: "Down / Complete",
  incomplete: "Incomplete",
  interception: "Interception",
  fumble: "Fumble · lost",
  "fumble-kept": "Fumble · own",
  good: "Good",
  missed: "Miss",
  touchback: "Touchback",
  faircatch: "Fair Catch",
  downed: "Downed",
  out: "Out",
  blocked: "Block",
  muff: "Muff",
  onside: "Onside",
  "fumble-touchback": "Fumble · TB",
  "defensive-two": "Defense +2",
  "safety-one": "Defense +1",
  "offensive-safety-one": "Offense +1",
};
const resultsByKind: Partial<Record<Kind, PlayInput["result"][]>> = {
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
  wildsnap: ["fumble-kept", "fumble", "fumble-touchback"],
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
const results = computed<PlayInput["result"][]>(
  () => resultsByKind[draft.kind] || ["normal"],
);
const availableKinds = computed<Kind[]>(() => {
  const state = props.play.before;
  if (state.phase === "try")
    return state.overtime && state.overtime.round >= 2
      ? ["two", "penalty"]
      : ["pat", "two", "penalty"];
  if (state.phase === "kickoff") return ["kickoff", "penalty"];
  return [
    "run",
    "pass",
    "sack",
    "kneel",
    "spike",
    "grounding",
    "wildsnap",
    "punt",
    "fieldgoal",
    "penalty",
  ];
});
const hasReturnSpot = computed(
  () =>
    ["interception", "fumble"].includes(draft.result) ||
    ["punt", "fieldgoal", "kickoff"].includes(draft.kind),
);
const validation = computed(() => {
  try {
    applyPlay(props.play.before, draft, props.play.id);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Bitte die Eingabe prüfen.";
  }
});
watch(
  () => draft.kind,
  () => {
    if (!results.value.includes(draft.result)) draft.result = results.value[0]!;
  },
);
function save() {
  if (!reason.value.trim() || validation.value) return;
  emit("save", draft, reason.value.trim());
}
onMounted(() => dialog.value?.showModal());
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <dialog
    ref="dialog"
    class="review-dialog"
    :aria-labelledby="titleId"
    :aria-describedby="`${titleId}-description`"
    @cancel.prevent="emit('close')"
  >
    <div class="review-head">
      <h2 :id="titleId">Play prüfen</h2>
      <button aria-label="Review schließen" @click="emit('close')">
        <X />
      </button>
    </div>
    <p :id="`${titleId}-description`">
      {{ play.before.down }}. &amp; {{ play.before.distance }} ·
      {{ spotLabel(play.before.ball) }}. Folgeplays werden neu berechnet.
      Ungültige Folgen blockieren das Speichern.
    </p>
    <div class="ruling-grid">
      <label
        >Play<select v-model="draft.kind" autofocus>
          <option v-for="kind in availableKinds" :key="kind" :value="kind">
            {{ labels[kind] }}
          </option>
        </select></label
      >
      <label>Yards<input v-model.number="draft.yards" type="number" /></label>
      <label
        >Ergebnis<select v-model="draft.result">
          <option v-for="r in results" :key="r" :value="r">
            {{
              r === "normal"
                ? draft.kind === "pass"
                  ? "Complete"
                  : "Down"
                : resultLabels[r]
            }}
          </option>
        </select></label
      >
      <label
        >Spieler<select v-model="draft.player">
          <option value="">Offen</option>
          <option
            v-for="p in roster.filter((p) => p.team === play.before.possession)"
            :key="p.number"
            :value="p.number"
          >
            #{{ p.number }} {{ p.name }}
          </option>
        </select></label
      >
      <label v-if="draft.kind === 'pass'"
        >Receiver<select v-model="draft.target">
          <option value="">Offen</option>
          <option
            v-for="p in roster.filter((p) => p.team === play.before.possession)"
            :key="p.number"
            :value="p.number"
          >
            #{{ p.number }} {{ p.name }}
          </option>
        </select></label
      >
      <label v-if="hasReturnSpot"
        >Folgespot<input
          v-model.number="draft.returnSpot"
          @input="draft.kickSpotOverride = true"
          type="number"
          min="1"
          :max="
            draft.result === 'blocked' &&
            draft.recoveryTeam === play.before.possession
              ? 100
              : 99
          "
      /></label>
      <label v-if="draft.result === 'faircatch'"
        >Catch-Spot<input
          v-model.number="draft.fairCatchSpot"
          type="number"
          min="0"
          max="99"
      /></label>
      <label v-if="['blocked', 'muff', 'onside'].includes(draft.result)"
        >Recovery<select v-model="draft.recoveryTeam">
          <option :value="undefined">Empfänger</option>
          <option value="home">{{ home }}</option>
          <option value="away">{{ away }}</option>
        </select></label
      >
    </div>
    <PlayRuling
      :draft="draft"
      :state="play.before"
      :roster="roster"
      :home="home"
      :away="away"
    />
    <label
      >Grund · erforderlich<input
        v-model="reason"
        placeholder="Korrektur nach Review"
        maxlength="200"
        @keydown.enter.prevent="save"
    /></label>
    <p v-if="validation" class="error-message" role="alert">{{ validation }}</p>
    <slot />
    <div class="review-actions">
      <button class="button light" @click="emit('close')">Abbrechen</button
      ><button
        class="button primary"
        :disabled="!reason.trim() || !!validation"
        @click="save"
      >
        Korrigieren
      </button>
    </div>
  </dialog>
</template>

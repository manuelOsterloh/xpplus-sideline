<script setup lang="ts">
import { Plus, X, Flag, Repeat2 } from "@lucide/vue";
import {
  other,
  type PlayInput,
  type State,
  type ReturnLeg,
} from "#shared/game";
const props = defineProps<{
  draft: PlayInput;
  state: State;
  roster: { number: string; name: string; team: string }[];
  home: string;
  away: string;
}>();
function penalty() {
  (props.draft.penalties ||= []).push({
    name: "",
    team: props.state.possession,
    status: "accepted",
    timing: "live",
    spot: "previous",
    foulSpot: props.state.ball,
    yards: 5,
    halfDistance: false,
    mode: "repeat",
    keepStats: false,
    safety: false,
  });
}
function leg() {
  const list = (props.draft.returns ||= []);
  const last = list.at(-1);
  const team = last
    ? last.fumbled
      ? other(last.team)
      : last.team
    : other(props.state.possession);
  const from = last ? (team === last.team ? last.to : 100 - last.to) : 20;
  const type: ReturnLeg["type"] = last
    ? last.fumbled
      ? "fumble"
      : "lateral"
    : props.draft.result === "interception"
      ? "interception"
      : ["fumble", "fumble-touchback"].includes(props.draft.result)
        ? "fumble"
        : (props.draft.kind as ReturnLeg["type"]);
  list.push({ team, from, to: from, player: "", type, fumbled: false });
}
const returnable = computed(
  () =>
    ["interception", "fumble"].includes(props.draft.result) ||
    (["punt", "kickoff", "fieldgoal"].includes(props.draft.kind) &&
      !(
        props.draft.result === "blocked" &&
        props.draft.recoveryTeam === props.state.possession
      ) &&
      ![
        "good",
        "touchback",
        "faircatch",
        "downed",
        "out",
        "onside",
        "muff",
      ].includes(props.draft.result)),
);
const lateralable = computed(
  () =>
    ["run", "pass"].includes(props.draft.kind) &&
    !["interception", "incomplete"].includes(props.draft.result),
);
</script>
<template>
  <div class="ruling-editor">
    <div class="ruling-actions">
      <button type="button" class="button light" @click="penalty">
        <Flag :size="18" /> Strafe
      </button>
      <button v-if="returnable" type="button" class="button light" @click="leg">
        <Repeat2 :size="18" /> Return
      </button>
      <button
        v-if="lateralable"
        type="button"
        class="button light"
        @click="(draft.laterals ||= []).push({ player: '', yards: 0 })"
      >
        <Plus :size="18" /> Lateral
      </button>
    </div>
    <p class="ruling-hint">
      Entscheidung der Officials übernehmen. Statistik-Yards enden am legalen
      Fortschritt, vor der Strafdistanz.
    </p>
    <fieldset v-for="(f, i) in draft.penalties" :key="i" class="ruling-card">
      <legend>Strafe {{ i + 1 }}</legend>
      <button
        type="button"
        class="remove-rule"
        :aria-label="`Strafe ${i + 1} entfernen`"
        @click="draft.penalties?.splice(i, 1)"
      >
        <X :size="18" />
      </button>
      <div class="ruling-grid">
        <label
          >Foul<input
            v-model="f.name"
            maxlength="100"
            placeholder="Holding, DPI …"
        /></label>
        <label
          >Gegen<select v-model="f.team">
            <option value="home">{{ home }}</option>
            <option value="away">{{ away }}</option>
          </select></label
        >
        <label
          >Entscheidung<select v-model="f.status">
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="offsetting">Offsetting</option>
          </select></label
        >
        <template v-if="f.status === 'accepted'">
          <label
            >Zeitpunkt<select v-model="f.timing">
              <option value="live">Live Ball</option>
              <option value="dead">Dead Ball</option>
            </select></label
          >
          <label
            >Enforcement<select v-model="f.spot">
              <option value="previous">Previous Spot</option>
              <option value="end">End Spot</option>
              <option value="foul">Foul Spot</option>
              <option value="kickoff">Nächster Kickoff</option>
            </select></label
          >
          <label v-if="f.spot === 'foul'"
            >Foul-Spot · Offense OWN<input
              v-model.number="f.foulSpot"
              type="number"
              min="0"
              max="100"
          /></label>
          <label
            >Straf-Yards<input
              v-model.number="f.yards"
              type="number"
              min="0"
              max="99"
              :disabled="f.halfDistance"
          /></label>
          <label
            >Down<select v-model="f.mode">
              <option value="repeat">Wiederholen</option>
              <option value="first">First Down</option>
              <option value="loss">Loss of Down</option>
              <option value="next">Play zählt</option>
            </select></label
          >
          <label class="check-label"
            ><input v-model="f.halfDistance" type="checkbox" /> Half
            Distance</label
          >
          <label v-if="f.timing === 'live'" class="check-label"
            ><input v-model="f.keepStats" type="checkbox" /> Play-Statistik
            zählt</label
          >
          <label class="check-label"
            ><input v-model="f.safety" type="checkbox" /> Safety verhängt</label
          >
        </template>
        <template v-if="state.overtime && f.status !== 'declined'">
          <label class="check-label"
            ><input v-model="f.afterChange" type="checkbox" /> Nach
            Ballwechsel</label
          >
          <label v-if="f.afterChange" class="check-label"
            ><input v-model="f.carryOver" type="checkbox" /> Übertrag laut
            Officials</label
          >
          <small v-if="f.afterChange"
            >OT: gewöhnliche Fouls werden per Regel abgelehnt; ein eigener
            Live-Ball-Foul annulliert den Score. Übertrag nur für die Ausnahmen
            nach 3-1-3g.</small
          >
        </template>
      </div>
    </fieldset>
    <fieldset
      v-for="(r, i) in draft.returns"
      :key="`r${i}`"
      class="ruling-card"
    >
      <legend>Return {{ i + 1 }}</legend>
      <button
        type="button"
        class="remove-rule"
        :aria-label="`Return ${i + 1} entfernen`"
        @click="draft.returns?.splice(i, 1)"
      >
        <X :size="18" />
      </button>
      <div class="ruling-grid">
        <label
          >Team<select v-model="r.team" @change="r.player = ''">
            <option value="home">{{ home }}</option>
            <option value="away">{{ away }}</option>
          </select></label
        >
        <label
          >Spieler<select v-model="r.player">
            <option value="">Offen</option>
            <option
              v-for="p in roster.filter((p) => p.team === r.team)"
              :key="p.number"
              :value="p.number"
            >
              #{{ p.number }} {{ p.name }}
            </option>
          </select></label
        >
        <label
          >Typ<select v-model="r.type">
            <option value="punt">Punt</option>
            <option value="kickoff">Kickoff</option>
            <option value="fieldgoal">Field Goal</option>
            <option value="interception">Interception</option>
            <option value="fumble">Recovery</option>
            <option value="lateral">Lateral</option>
          </select></label
        >
        <label
          >Von · eigene Goalline<input
            v-model.number="r.from"
            type="number"
            min="0"
            max="100"
        /></label>
        <label
          >Bis · 100 = TD<input
            v-model.number="r.to"
            type="number"
            min="0"
            max="100"
        /></label>
        <label class="check-label"
          ><input v-model="r.fumbled" type="checkbox" /> Fumble am Ende</label
        >
      </div>
      <p>
        {{ r.to - r.from }} Yards ·
        {{
          r.to === 100 ? "Touchdown" : r.to === 0 ? "Safety" : "Ball im Feld"
        }}. Nach Fumble eine Recovery ergänzen.
      </p>
    </fieldset>
    <fieldset
      v-for="(l, i) in draft.laterals"
      :key="`l${i}`"
      class="ruling-card"
    >
      <legend>Lateral {{ i + 1 }}</legend>
      <button
        type="button"
        class="remove-rule"
        :aria-label="`Lateral ${i + 1} entfernen`"
        @click="draft.laterals?.splice(i, 1)"
      >
        <X :size="18" />
      </button>
      <div class="ruling-grid">
        <label
          >Empfänger<select v-model="l.player">
            <option value="">Wählen</option>
            <option
              v-for="p in roster.filter((p) => p.team === state.possession)"
              :key="p.number"
              :value="p.number"
            >
              #{{ p.number }} {{ p.name }}
            </option>
          </select></label
        >
        <label
          >Yards ab Lateral<input v-model.number="l.yards" type="number"
        /></label>
      </div>
      <p>
        Teil der gesamten Play-Yards. Keine zusätzliche Reception oder Rush
        Attempt.
      </p>
    </fieldset>
    <label v-if="draft.penalties?.length" class="check-label"
      ><input v-model="draft.untimedAfter" type="checkbox" /> Untimed Down
      angeordnet</label
    >
  </div>
</template>

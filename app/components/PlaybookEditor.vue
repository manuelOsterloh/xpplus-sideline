<script setup lang="ts">
import { Check, Pencil, Plus } from "@lucide/vue";
import { categories, type CallEntry, type Category } from "#shared/playbook";
const entries = defineModel<CallEntry[]>({ required: true });
const side = ref<"offense" | "defense">("offense"),
  active = ref<Category>("formation"),
  name = ref(""),
  coverageType = ref<"Man" | "Zone">("Zone"),
  editing = ref(""),
  error = ref("");
const saved = ref("");
const inputId = useId();
const nameInput = ref<HTMLInputElement>();
const visible = computed(() =>
  entries.value.filter((e) => e.category === active.value),
);
function setSide(value: "offense" | "defense") {
  side.value = value;
  active.value = value === "offense" ? "formation" : "alignment";
  cancel();
}
function cancel() {
  editing.value = "";
  name.value = "";
  error.value = "";
}
function edit(entry: CallEntry) {
  editing.value = entry.id;
  name.value = entry.name;
  coverageType.value = entry.coverageType || "Zone";
  error.value = "";
  saved.value = "";
  nextTick(() => nameInput.value?.focus());
}
function save() {
  if (!name.value.trim()) {
    error.value = "Bitte einen Begriff eingeben.";
    return;
  }
  if (
    entries.value.some(
      (e) =>
        e.category === active.value &&
        e.name.toLowerCase() === name.value.trim().toLowerCase() &&
        e.id !== editing.value,
    )
  ) {
    error.value = "Dieser Begriff existiert bereits.";
    return;
  }
  const entry = {
    id: editing.value || crypto.randomUUID(),
    name: name.value.trim(),
    category: active.value,
    ...(active.value === "coverage"
      ? { coverageType: coverageType.value }
      : {}),
  };
  const i = entries.value.findIndex((e) => e.id === editing.value);
  if (i >= 0) entries.value.splice(i, 1, entry);
  else entries.value.push(entry);
  saved.value = `${entry.name} ${i >= 0 ? "aktualisiert" : "hinzugefügt"}.`;
  cancel();
}
</script>
<template>
  <section class="panel playbook-panel">
    <div class="panel-heading">
      <h2>Deine Sprache. Dein Playbook.</h2>
      <div class="segmented">
        <button
          :class="{ selected: side === 'offense' }"
          :aria-pressed="side === 'offense'"
          @click="setSide('offense')"
        >
          Offense</button
        ><button
          :class="{ selected: side === 'defense' }"
          :aria-pressed="side === 'defense'"
          @click="setSide('defense')"
        >
          Defense
        </button>
      </div>
    </div>
    <p class="section-description">
      Eigene Begriffe einmal anlegen, an der Sideline mit einem Tap auswählen.
      Bestehende Spielzug-Tags bleiben bei Änderungen erhalten.
    </p>
    <div class="playbook-tabs">
      <button
        v-for="category in categories.filter((c) => c.side === side)"
        :key="category.id"
        :class="{ selected: active === category.id }"
        :aria-pressed="active === category.id"
        @click="
          active = category.id;
          cancel();
        "
      >
        {{ category.name }}
      </button>
    </div>
    <form class="playbook-form" @submit.prevent="save">
      <label
        >{{ editing ? "Begriff bearbeiten" : "Neuer Begriff"
        }}<input
          v-model="name"
          ref="nameInput"
          :id="inputId"
          :aria-invalid="!!error"
          :aria-describedby="error ? `${inputId}-error` : undefined"
          autocomplete="off"
          @input="
            error = '';
            saved = '';
          "
          maxlength="50"
          placeholder="Team-Bezeichnung" /></label
      ><label v-if="active === 'coverage'"
        >Coverage-Typ<select v-model="coverageType">
          <option>Man</option>
          <option>Zone</option>
        </select></label
      ><button class="button primary" type="submit">
        <component
          :is="editing ? Check : Plus"
          :size="17"
          aria-hidden="true"
        />{{ editing ? "Speichern" : "Hinzufügen" }}</button
      ><button
        v-if="editing"
        class="button light"
        type="button"
        @click="cancel"
      >
        Abbrechen
      </button>
    </form>
    <p v-if="error" :id="`${inputId}-error`" class="error-message" role="alert">
      {{ error }}
    </p>
    <p v-if="saved" class="section-description" role="status">{{ saved }}</p>
    <p v-if="!visible.length" class="section-description">
      Noch keine Begriffe in dieser Kategorie. Lege oben den ersten an.
    </p>
    <div class="playbook-entries">
      <button
        v-for="entry in visible"
        :key="entry.id"
        :aria-label="`${entry.name} bearbeiten`"
        @click="edit(entry)"
      >
        <span
          >{{ entry.name
          }}<small v-if="entry.coverageType">{{
            entry.coverageType
          }}</small></span
        ><Pencil :size="15" />
      </button>
    </div>
  </section>
</template>

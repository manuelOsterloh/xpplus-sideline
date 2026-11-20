<script setup lang="ts">
import { categories, type CallEntry, type Category } from "#shared/playbook";
import type { PlayInput } from "#shared/game";
const props = defineProps<{
  draft: PlayInput;
  entries: CallEntry[];
  side: "offense" | "defense";
}>();
const emit = defineEmits<{
  done: [];
  select: [category: Category, value: string, type?: string];
}>();
</script>
<template>
  <div class="call-picker">
    <div
      v-for="category in categories.filter((c) => c.side === side)"
      :key="category.id"
      class="call-category"
      role="group"
      :aria-label="category.name"
    >
      <span>{{ category.name }}</span>
      <div>
        <button
          v-for="entry in entries.filter((e) => e.category === category.id)"
          :key="entry.id"
          :class="{ selected: draft[category.id] === entry.name }"
          :aria-pressed="draft[category.id] === entry.name"
          @click="
            emit(
              'select',
              category.id,
              draft[category.id] === entry.name ? '' : entry.name,
              entry.coverageType,
            )
          "
        >
          {{ entry.name
          }}<small v-if="entry.coverageType">{{ entry.coverageType }}</small>
        </button>
        <small v-if="!entries.some((e) => e.category === category.id)"
          >Noch keine Begriffe. Im Playbook ergänzen.</small
        >
      </div>
    </div>
    <button class="button primary" @click="emit('done')">Übernehmen</button>
  </div>
</template>

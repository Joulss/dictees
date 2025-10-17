<template>
  <div class="grid gap-4">
    <dictation-card v-for="dictation in dictations"
                    :key="dictation.createdAt"
                    :dict="dictation"
                    :all-dictations="dictations"
                    @update="onUpdate"
                    @delete="onDelete"/>
  </div>
</template>


<script setup lang="ts">
  import DictationCard from './DictationCard.vue';
  import { Dictation } from '../types.ts';

  defineProps<{ dictations: Dictation[] }>();

  const emit = defineEmits<{
    update: [payload: Dictation];
    delete: [createdAt: string];
  }>();

  function onUpdate(payload: Dictation) {
    emit('update', payload);
  }
  function onDelete(createdAt: string) {
    emit('delete', createdAt);
  }
</script>

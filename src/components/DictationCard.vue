<template>
  <div class="rounded-lg p-4 drop-shadow-md bg-white">{{ dictation }}</div>
</template>


<script setup lang="ts">
  import { Dictation } from '@/types.ts';

  defineProps<{
    dictation: Dictation
  }>();
</script>


<style scoped>

</style>

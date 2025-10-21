<template>
  <pre>{{ list }}</pre>
</template>


<script setup lang="ts">
  import { List } from '@/types.ts';

  defineProps<{
    list: List
  }>();
</script>


<style scoped>

</style>

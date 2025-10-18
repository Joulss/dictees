<template>
  <h2 class="mt-5 mb-3">
    <img src="../assets/icons/dictation.svg"
         alt="Dictée"
         class="inline h-5 w-5 mr-1 -mt-1" />
    {{ title }}
  </h2>
</template>


<script setup lang="ts">
  defineProps<{
    title: string
  }>();
</script>

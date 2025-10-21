<template>
  <div id="initial-spinner-container"
       aria-label="Chargement">
    <svg class="spinner"
         viewBox="0 0 24 24"
         aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-dasharray="56" stroke-dashoffset="14" />
    </svg>
    <div id="initial-loading-text">Chargement...</div>
  </div>
</template>


<script setup lang="ts">

</script>



<style scoped>
  #initial-spinner-container {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;
    background: #fff;
  }
  .spinner {
    --size: 42px;
    --thickness: 4px;
    width: var(--size);
    height: var(--size);
    display: block;
    transform-box: fill-box;
    transform-origin: center;
    animation: rot .9s linear infinite;
    color: #aaa;
  }
  .spinner circle {
    fill: none;
    stroke: currentColor;
    vector-effect: non-scaling-stroke;
    stroke-width: var(--thickness);
  }
  @keyframes rot { to { transform: rotate(360deg); } }
</style>

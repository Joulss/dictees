<template>
  <loading-spinner v-if="!ready" />

  <div v-else class="p-6 flex justify-center">
    <div class="w-4xl">
      <div class="text-6xl title font-">Dictées</div>
      <hr />
      <section-title title="Nouvelle dictée" />
      <!--      <dictation-form @submit="handleCreate" />-->
      <!--      <section-title title="Liste des dictées" />-->
      <!--      <dictations-list :dictations="dictations"-->
      <!--                       @update="handleUpdate"-->
      <!--                       @delete="handleDelete"/>-->
      <button @click="addList">Add list</button>
      <br />
      <button @click="addDictation">Add dictation</button>

      <div v-for="item in feed"
           :key="item.createdAt"
           class="pb-3">
        <dictation-card v-if="item.kind === 'dictation'"
                        :dictation="item" />
        <list-card v-else-if="item.kind === 'list'"
                   :list="item" />
      </div>
    </div>
  </div>

  <div class="toast-container">
    <div v-for="toast in toasts"
         :key="toast.id"
         class="toast"
         :class="toast.type">
      <div v-if="toast.title"
           class="toast-title">{{ toast.title }}</div>
      <div class="toast-message">{{ toast.message }}</div>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { nextTick, onMounted, ref } from 'vue';
  import { loadLefffAssets } from './lefff/lefff.ts';
  import SectionTitle from './components/SectionTitle.vue';
  import { Dictation, Feed, List, Toast } from './types.ts';
  import LoadingSpinner from './components/LoadingSpinner.vue';
  import { getFeed, writeFeed } from '@/lib/userDb.ts';
  import DictationCard from '@/components/DictationCard.vue';
  import ListCard from '@/components/ListCard.vue';

  const ready  = ref(false);
  const toasts = ref<Toast[]>([]);
  const feed   = ref<Feed>([]);

  async function loadData() {
    feed.value = await getFeed();
  }

  async function addList() {
    feed.value.unshift({
      createdAt : Date.now().toString(),
      kind      : 'list',
      title     : 'Test',
      words     : []
    } satisfies List);
    await writeFeed(feed.value);
  }

  async function addDictation() {
    feed.value.unshift({
      createdAt : Date.now().toString(),
      kind      : 'dictation',
      title     : 'Dictée test',
      text      : 'Ceci est le texte de la dictée.'
    } satisfies Dictation);
    await writeFeed(feed.value);
  }

  onMounted(async() => {
    await nextTick();
    try {
      await loadLefffAssets();
      await loadData();
      ready.value = true;
    } catch (error) {
      console.error('Failed to load LEFFF assets:', error);
    }
  });
</script>


<style scoped>
  .title {
    font-family: ChettaVissto, sans-serif;
  }
</style>

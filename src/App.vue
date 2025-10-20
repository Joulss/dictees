<template>
  <div v-if="!assetsLoaded"
       id="initial-spinner-container"
       aria-label="Chargement">
    <svg class="spinner"
         viewBox="0 0 24 24"
         aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-dasharray="56" stroke-dashoffset="14" />
    </svg>
    <div id="initial-loading-text">Chargement...</div>
  </div>

  <div v-else class="p-6 flex justify-center">
    <div class="w-4xl">
      <div class="title">Dictées</div>
      <hr />
      <section-title title="Nouvelle dictée" />
      <dictation-form @submit="handleCreate" />
      <section-title title="Liste des dictées" />
      <dictations-list :dictations="dictations"
                       @update="handleUpdate"
                       @delete="handleDelete"/>
    </div>
  </div>

  <div class="toast-container">
    <div v-for="t in toasts"
         :key="t.id"
         class="toast"
         :class="t.type">
      <div v-if="t.title"
           class="toast-title">{{ t.title }}</div>
      <div class="toast-message">{{ t.message }}</div>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { onMounted, provide, ref } from 'vue';
  import DictationForm from './components/DictationForm.vue';
  import DictationsList from './components/DictationsList.vue';
  import { createDictation, readDb, writeDbSafe } from './lib/userDb';
  import { nextDictationColor } from './lib/colors';
  import { Dictation, SHOW_TOAST_KEY, ShowToastFn, ToastPayload } from './types.ts';
  import SectionTitle from './components/SectionTitle.vue';
  import { loadLefffAssets } from './lefff/assets.ts';

  const dictations   = ref<Dictation[]>([]);
  const assetsLoaded = ref(false);
  const toasts       = ref<ToastPayload[]>([]);

  const showToast: ShowToastFn = (payload: ToastPayload) => {
    const id = Date.now() + Math.random();
    toasts.value.push({ id, ...payload });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 5000);
  };

  async function loadDictations() {
    const db = await readDb();
    const list: Dictation[] = Array.isArray((db as any).dictees) ? (db as any).dictees : [];
    dictations.value = list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  async function handleCreate(payload: { title: string; text: string }) {
    const used  = dictations.value.map(d => d.color).filter(Boolean) as string[];
    const color = nextDictationColor(used);
    const db    = await readDb();
    const dictees: Dictation[] = Array.isArray((db as any).dictees)
      ? (db as any).dictees
      : [];
    const newDict = createDictation({
      title : payload.title,
      text  : payload.text,
      color
    });
    dictees.push(newDict);
    await writeDbSafe({ ...db, dictees });
    await loadDictations();
  }

  async function handleUpdate(updated: Dictation) {
    const db = await readDb();
    const dictees: Dictation[] = Array.isArray((db as any).dictees) ? (db as any).dictees : [];
    const idx = dictees.findIndex(d => d.createdAt === updated.createdAt);
    if (idx >= 0) {
      dictees[idx] = updated;
    }
    await writeDbSafe({ ...db, dictees });
    await loadDictations();
    showToast({
      type    : 'success',
      title   : 'Dictée mise à jour',
      message : `La dictée "${updated.title}" a été mise à jour avec succès.`
    });
  }

  async function handleDelete(createdAt: string) {
    const db = await readDb();
    const dictees: Dictation[] = Array.isArray((db as any).dictees) ? (db as any).dictees : [];
    const next = dictees.filter(d => d.createdAt !== createdAt);
    await writeDbSafe({ ...db, dictees: next });
    await loadDictations();
  }

  onMounted(async() => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      await loadLefffAssets();
    } catch (error) {
      console.error('Failed to load LEFFF assets:', error);
    }
    assetsLoaded.value = true;
    await loadDictations();
  });

  provide(SHOW_TOAST_KEY, showToast);
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

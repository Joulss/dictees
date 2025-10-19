<template>
  <div class="p-6 flex justify-center">
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
</template>


<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import DictationForm from './components/DictationForm.vue';
  import DictationsList from './components/DictationsList.vue';
  import { createDictation, readDb, writeDbSafe } from './lib/userDb';
  import { nextDictationColor } from './lib/colors';
  import { Dictation } from './types.ts';
  import SectionTitle from './components/SectionTitle.vue';

  const dictations = ref<Dictation[]>([]);

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
  }

  async function handleDelete(createdAt: string) {
    const db = await readDb();
    const dictees: Dictation[] = Array.isArray((db as any).dictees) ? (db as any).dictees : [];
    const next = dictees.filter(d => d.createdAt !== createdAt);
    await writeDbSafe({ ...db, dictees: next });
    await loadDictations();
  }

  onMounted(loadDictations);
</script>

<template>
  <div class="wrap">
    <button :disabled="!assetsReady" @click="resolvePrendra">
      Resolve "prendra"
    </button>
    <pre class="log">{{ log || (assetsReady ? 'Ready.' : 'Loading assets…') }}</pre>
    <button @click="testReadDb">Read user DB</button>
    <button @click="testWriteDb">Write user DB (append "prendra")</button>

    <section style="margin-top:24px;">
      <h2>Mots connus (DB utilisateur)</h2>
      <div style="display:flex; gap:8px; align-items:center;">
        <input v-model="knownInput" placeholder="surface ex: prendra" style="padding:6px; min-width:220px;">
        <button @click="addKnown">Ajouter</button>
        <button @click="refreshKnown">Rafraîchir</button>
        <span>{{ dbMsg }}</span>
      </div>
      <ul v-if="knownList?.length" style="margin-top:8px;">
        <li v-for="w in knownList" :key="w">{{ w }}</li>
      </ul>
      <p v-else style="margin-top:8px; opacity:0.7;">Aucun mot connu.</p>
    </section>
  </div>
</template>


<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { loadLefffAssets } from './lefff/assets';
import { getAnalysesByForm } from './lefff/repository';
import {readUserDb, writeUserDb} from "./lib/ipc.ts";
import {addKnownWord, getKnownWords} from "./lib/userDb.ts";

const assetsReady = ref(false);
const log = ref('');
const knownInput = ref('');
const knownList = ref<string[] | null>(null);
const dbMsg = ref('');


onMounted(async () => {
  try {
    await loadLefffAssets();
    assetsReady.value = true;
  } catch (e) {
    log.value = `loadLefffAssets error: ${String(e)}`;
    console.error(e);
  }
});

async function resolvePrendra() {
  try {
    const res = getAnalysesByForm('prendra'); // renvoie ApiAnalysis[] enrichies (grammar ok)
    const lines = res.slice(0, 2).map(a => {
      const mood  = a.grammar?.mood ?? '';
      const tense = a.grammar?.tense ?? '';
      return `• ${[mood, tense].filter(Boolean).join(' ')}`;
    });
    log.value = lines.length ? lines.join('\n') : 'No analyses';
    console.info('prendra (first 2)', res.slice(0, 2));
  } catch (e) {
    log.value = `resolve error: ${String(e)}`;
    console.error(e);
  }
}


async function addKnown() {
  try {
    await addKnownWord(knownInput.value);
    knownInput.value = '';
    await refreshKnown();
    dbMsg.value = 'Added ✔';
  } catch (e) {
    dbMsg.value = `Error: ${String(e)}`;
  }
}

async function refreshKnown() {
  knownList.value = await getKnownWords();
}


async function testReadDb() {
  try {
    const raw = await readUserDb();
    log.value = `DB: ${raw}`;
  } catch (e) {
    log.value = `read DB error: ${String(e)}`;
  }
}

async function testWriteDb() {
  try {
    const current = JSON.parse(await readUserDb()) as { dictees: unknown[]; words: unknown[] };
    current.words = [...(current.words ?? []), { surface: 'prendra', addedAt: Date.now() }];
    await writeUserDb(JSON.stringify(current));
    log.value = 'DB updated (added "prendra" in words).';
  } catch (e) {
    log.value = `write DB error: ${String(e)}`;
  }
}
</script>



<style scoped>
.wrap { padding: 24px; font-family: system-ui, sans-serif; }
.log { margin-top: 16px; background: #111; color: #eee; padding: 12px; border-radius: 8px; min-height: 120px; white-space: pre-wrap; }
</style>

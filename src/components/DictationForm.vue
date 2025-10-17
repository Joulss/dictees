<template>
  <form @submit.prevent="onSubmit" class="grid gap-2">
    <h2>📚 Nouvelle dictée</h2>

    <label class="grid gap-1">
      <strong>Titre</strong>
      <input v-model="title"
             type="text"
             class="border rounded px-2 py-1"
             placeholder="ex: 17/10/2025"/>
    </label>

    <label class="grid gap-1">
      <strong>Texte</strong>
      <textarea v-model="text"
                rows="8"
                class="border rounded px-2 py-1"
                placeholder="Saisis ici le texte de la dictée…"></textarea>
    </label>

    <div class="flex items-center gap-3">
      <button type="submit"
              :disabled="!canSubmit"
              class="border rounded px-3 py-1">
        Enregistrer la dictée
      </button>
      <span v-if="error"
            class="text-red-600 text-sm">{{ error }}</span>
    </div>
  </form>
</template>


<script setup lang="ts">
  import { computed, ref } from 'vue';

  const emit = defineEmits<{
    submit: [payload: { title: string; text: string }]
  }>();

  const today = new Date().toLocaleDateString('fr-FR');
  const title = ref(today);
  const text  = ref('');
  const error = ref<string | null>(null);

  const canSubmit = computed(() => text.value.trim().length > 0);

  function onSubmit() {
    error.value = null;
    if (!canSubmit.value) {
      error.value = 'Le texte est vide';
      return;
    }
    emit('submit', { title: (title.value || today).trim(), text: text.value });
    title.value = new Date().toLocaleDateString('fr-FR');
    text.value = '';
  }
</script>

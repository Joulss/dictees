<template>
  <div class="feed-element mb-6">

    <div v-if="!isEditing"
         class="flex items-center gap-2 mb-3">

      <h2 class="text-xl font-bold">{{ title }}</h2>
      <div class="ml-auto flex gap-2">
        <button class="btn btn-primary"
                @click="isEditing = true">
          <img src="../assets/icons/edit.svg"
               alt="Add dictation icon"
               class="inline h-4 w-4 mr-1 invert" />
          Éditer
        </button>
        <button class="btn btn-danger"
                @click="onDelete">
          <img src="../assets/icons/trash.svg"
               alt="Add dictation icon"
               class="inline h-4 w-4 mr-1 invert" />
          Supprimer
        </button>
      </div>
    </div>

    <div v-else
         class="flex items-center gap-2 mb-3">
      <div class="text-sm font-bold">Titre</div>
      <input v-model="title"
             class="flex-1" />
      <button class="btn btn-primary"
              @click="exitEdit">
        <img src="../assets/icons/cancel.svg"
             alt="Add dictation icon"
             class="inline h-4 w-4 mr-1" />
        Quitter le mode édition
      </button>
      <button :disabled="!isDirty"
              class="btn btn-primary"
              @click="onSave">
        <img src="../assets/icons/save.svg"
             alt="Save icon"
             class="inline h-4 w-4 mr-1" />
        Enregistrer
      </button>
    </div>

    <textarea v-if="isEditing"
              v-model="text"
              rows="8"
              class="w-full p-2 border rounded-lg resize-y mb-2"></textarea>

    <dictation-text :dictation="dictation" />
  </div>
</template>


<script setup lang="ts">
  import { Dictation } from '@/types.ts';
  import { computed, onMounted, ref } from 'vue';
  import DictationText from '@/components/DictationText.vue';

  const props = defineProps<{
    dictation: Dictation
  }>();

  const emit = defineEmits<{
    delete: [dictation: Dictation]
    save: [dictation: Dictation]
  }>();

  const title     = ref('');
  const text      = ref('');
  const isEditing = ref(false);

  const isDirty = computed(() =>
    text.value !== props.dictation.text
    || title.value !== props.dictation.title);

  function onDelete() {
    emit('delete', props.dictation);
  }

  function exitEdit() {
    if (isDirty.value) {
      if (confirm('You have unsaved changes. Are you sure you want to exit without saving?')) {
        title.value = props.dictation.title;
        text.value  = props.dictation.text;
      } else {
        return;
      }
    }
    isEditing.value = false;
  }

  function onSave() {
    emit('save', {
      ...props.dictation,
      title : title.value,
      text  : text.value
    });
  }

  onMounted(() => {
    title.value = props.dictation.title;
    text.value  = props.dictation.text;
  });
</script>


<style scoped>

</style>

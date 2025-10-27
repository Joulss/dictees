<template>
  <div :title="word.forms.length > 1
         ? word.forms.join(', ')
         : undefined"
       @contextmenu.prevent="openMenu($event)">
    <div class="tag-wrapper" v-if="!isDisabled">
      <span :style="{
              backgroundColor: word.color,
              color: 'white',
              fontStyle: !word.pos ? 'italic' : 'normal'
            }"
            class="tag tag-with-button text-nowrap">
        {{ word.word }}{{ displayedPos }}
      </span>
      <button class="tag-button"
              :style="{
                backgroundColor: word.color,
                color: 'white'
              }"
              @click.stop="emit('remove')"
              :aria-label="`Supprimer ${word}`"
              type="button">
        <img src="../assets/icons/x.svg" alt="" aria-hidden="true" />
      </button>
    </div>

    <span v-else
          :style="{
            backgroundColor: !isDisabled ? word.color : undefined,
            color: isDisabled ? '#666' : 'white',
            fontStyle: !word.pos ? 'italic' : 'normal'
          }"
          class="tag"
          :class="{
            disabled: isDisabled
          }">
      {{ word }}{{ word.pos ? `(${getMappedPos(word.pos)})` : '' }}
    </span>

    <context-menu :open="menu.open"
                  :x="menu.x"
                  :y="menu.y"
                  @close="menu.open=false">
      <ul>
        <li class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer">Simple item</li>
        <li class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2">
          <span>Copy</span>
        </li>
        <li class="px-3 py-2">
          <button class="w-full rounded-lg border px-3 py-2 text-left text-sm">A full button inside</button>
        </li>
      </ul>
    </context-menu>

  </div>
</template>


<script setup lang="ts">
  import { computed, reactive } from 'vue';
  import { getMappedPos } from '@/lefff/lefff.ts';
  import { ListWord } from '@/types.ts';
  import ContextMenu from '@/components/ContextMenu.vue';

  const emit = defineEmits(['remove']);

  const props = defineProps<{
    word: ListWord
    isDisabled?: boolean
  }>();

  const displayedPos = computed(() => {
    return props.word.pos && props.word.kind === 'lemma'
      ? ` (${getMappedPos(props.word.pos)})`
      : '';
  });

  const menu = reactive({ open: false, x: 0, y: 0 });

  function openMenu(e: MouseEvent) {
    menu.x = e.clientX;
    menu.y = e.clientY;
    menu.open = true;
  }
</script>

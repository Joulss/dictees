<template>
  <Teleport to="body">
    <div v-if="visible"
         ref="menuRef"
         :style="{
           position: 'fixed',
           top: `${localPosition.y}px`,
           left: `${localPosition.x}px`,
           zIndex: 9999
         }"
         class="bg-white border border-gray-300 rounded shadow-lg w-max max-w-sm"
         @click.stop
         @contextmenu.prevent>
      <template v-if="menuItems.length > 0">
        <button v-for="(item, index) in menuItems"
                :key="index"
                :title="item.forms && item.forms.length > 0 ? `Formes : ${item.forms.join(', ')}` : undefined"
                class="block text-left px-4 py-2 text-xs relative whitespace-nowrap"
                :class="{
                  'text-red-600': item.isDelete,
                  'italic': item.isExotic,
                  'hover:bg-gray-100 cursor-pointer': !item.isInherited,
                  'cursor-default text-gray-600': item.isInherited
                }"
                @click="handleItemClick(item)">
          <span>{{ item.label }}</span>
          <span v-if="item.forms && item.forms.length > 0"
                class="text-gray-500 ml-1">
            [{{ item.forms.length }} forme{{ item.forms.length > 1 ? 's' : '' }}]
          </span>
        </button>
      </template>
      <div v-else class="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
        Aucune action disponible
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
  import type { MenuItem, MenuItemAction } from '../types';

  interface Props {
    visible: boolean;
    position: { x: number; y: number };
    menuItems: MenuItem[];
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{ action: [MenuItemAction]; close: [] }>();

  const menuRef = ref<HTMLElement | null>(null);
  const localPosition = ref({ x: 0, y: 0 });

  /** Recalcule et ajuste la position réelle après rendu (largeur/hauteur connues) */
  async function recalcPosition() {
    if (!props.visible) {
      return;
    }
    await nextTick(); // attendre insertion
    const el = menuRef.value;
    if (!el) {
      localPosition.value = { ...props.position };
      return;
    }
    const rect = el.getBoundingClientRect();
    let x = props.position.x;
    let y = props.position.y + 7;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Basculer à gauche si nécessaire
    if (x + rect.width > vw) {
      x = props.position.x - rect.width - 8;
      if (x < 4) {
        x = Math.max(4, vw - rect.width - 4);
      }
    }
    // Ajuster verticalement si dépassement bas
    if (y + rect.height > vh) {
      y = vh - rect.height - 8;
      if (y < 4) {
        y = 4;
      }
    }
    localPosition.value = { x, y };
  }

  // Recalcul sur : ouverture, changement position brute, changement contenu
  watch(() => props.visible, v => {
    if (v) {
      // position initiale brute avant ajustement
      localPosition.value = { ...props.position };
      recalcPosition();
    }
  });
  watch(() => props.position, () => {
    if (props.visible) {
      localPosition.value = { ...props.position };
      recalcPosition();
    }
  }, { deep: true });
  watch(() => props.menuItems, () => {
    if (props.visible) {
      recalcPosition();
    }
  }, { deep: true });

  function handleItemClick(item: MenuItem) {
    emit('action', item.action);
    emit('close');
  }

  function handleGlobal(event: MouseEvent) {
    if (!props.visible) {
      return;
    }
    const target = event.target as HTMLElement;
    const isWord = !!target.closest('span[data-start]');

    if (event.type === 'contextmenu' && isWord) {
      return; // laisser le composable repositionner
    }
    if (menuRef.value && !menuRef.value.contains(target)) {
      emit('close');
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (props.visible && e.key === 'Escape') {
      emit('close');
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleGlobal);
    // Retrait de l'écouteur contextmenu global qui pouvait fermer / empêcher l'ouverture
    document.addEventListener('keydown', handleEscape);
  });
  onUnmounted(() => {
    document.removeEventListener('click', handleGlobal);
    document.removeEventListener('keydown', handleEscape);
  });
</script>

<template>
  <Teleport to="body">
    <div v-if="visible"
         ref="menuRef"
         :style="{
           position: 'fixed',
           top: `${position.y}px`,
           left: `${position.x}px`,
           zIndex: 9999
         }"
         class="bg-white border border-gray-300 rounded shadow-lg min-w-48"
         @click.stop
         @contextmenu.prevent>
      <template v-if="menuItems.length > 0">
        <button v-for="(item, index) in menuItems"
                :key="index"
                :title="item.forms && item.forms.length > 0 ? `Formes : ${item.forms.join(', ')}` : undefined"
                class="w-full text-left px-4 py-2 text-xs relative"
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
      <div v-else class="px-4 py-2 text-xs text-gray-500">
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

  const emit = defineEmits<{
    action: [action: MenuItemAction];
    close: [];
  }>();

  const menuRef = ref<HTMLElement | null>(null);
  let clickListenersActive = false;

  // Activer/désactiver les écouteurs selon la visibilité
  watch(() => props.visible, async newVal => {
    console.log('🎨 Menu visible:', newVal);

    if (newVal) {
      // Désactiver temporairement les écouteurs
      clickListenersActive = false;

      // Attendre un court délai pour éviter que le clic-droit initial ne ferme le menu
      await nextTick();
      setTimeout(() => {
        clickListenersActive = true;
        console.log('✅ Écouteurs activés');
      }, 100);
    } else {
      clickListenersActive = false;
    }
  });

  function handleItemClick(item: MenuItem) {
    console.log('🔘 Item cliqué:', item);
    emit('action', item.action);
    emit('close');
  }

  function handleClickOutside(event: MouseEvent) {
    // Ne rien faire si les écouteurs ne sont pas actifs
    if (!clickListenersActive) {
      return;
    }

    // Si on clique sur un span avec data-start, c'est un clic sur un mot du texte
    const target = event.target as HTMLElement;
    if (target.closest && target.closest('span[data-start]')) {
      // Si c'est un clic droit (contextmenu), ne pas fermer le menu car handleRightClick va le repositionner
      if (event.type === 'contextmenu') {
        console.log('🎯 Clic droit sur un mot du texte, le menu va se repositionner');
        return;
      }
      // Si c'est un clic gauche, on ferme le menu normalement
      console.log('👆 Clic gauche sur un mot du texte, fermeture du menu');
    }

    if (props.visible && menuRef.value && !menuRef.value.contains(event.target as Node)) {
      console.log('👆 Clic à l\'extérieur');
      emit('close');
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (props.visible && event.key === 'Escape') {
      console.log('⌨️ Échap');
      emit('close');
    }
  }

  onMounted(() => {
    console.log('🎬 Monté');
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  });

  onUnmounted(() => {
    console.log('🛑 Démonté');
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('contextmenu', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  });
</script>

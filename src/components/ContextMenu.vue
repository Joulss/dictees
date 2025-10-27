<template>
  <teleport to="body">
    <div v-if="open"
         class="fixed inset-0 z-[9998]"
         @contextmenu.prevent
         @mousedown.self="emitClose"
         @wheel.passive="emitClose">
      <div ref="menuRef"
           :style="styleObject"
           class="absolute z-[9999] min-w-40 max-w-[90vw] rounded-sm border border-neutral-200/60 bg-white/95 shadow-xl backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95"
           role="menu"
           @keydown.esc.prevent.stop="emitClose">
        <slot></slot>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

  const props = defineProps<{
    open: boolean
    x: number
    y: number
  }>();

  const emit = defineEmits<{
    close: []
  }>();

  const menuRef = ref<HTMLElement | null>(null);
  const placed  = ref<{ top: number; left: number }>({ top: 0, left: 0 });

  const styleObject = computed(() => ({ top: `${placed.value.top}px`, left: `${placed.value.left}px` }));

  function emitClose() {
    emit('close');
  }

  function placeMenu() {
    const el = menuRef.value;
    if (!el) {
      placed.value = { top: props.y, left: props.x };
      return;
    }

    const vpW   = window.innerWidth;
    const vpH   = window.innerHeight;
    const rect  = el.getBoundingClientRect();
    const menuW = rect.width || 200;
    const menuH = rect.height || 120;
    let left    = props.x;
    let top     = props.y;

    if (left + menuW > vpW) {
      left = Math.max(8, props.x - menuW);
    }
    if (top + menuH > vpH) {
      top = Math.max(8, props.y - menuH);
    }
    left = Math.min(Math.max(8, left), vpW - menuW - 8);
    top = Math.min(Math.max(8, top), vpH - menuH - 8);
    placed.value = { top, left };
  }

  watch(
    () => props.open,
    isOpen => {
      if (isOpen) {
        requestAnimationFrame(placeMenu);
      }
    },
    { immediate: true }
  );

  function onResize() {
    if (props.open) {
      placeMenu();
    }
  }

  onMounted(() => {
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
  });
</script>

<style scoped>
/* Color Theme Swatches in Hex */
.Colliding-Power-1-hex { color: #363432; }
.Colliding-Power-2-hex { color: #196774; }
.Colliding-Power-3-hex { color: #90A19D; }
.Colliding-Power-4-hex { color: #F0941F; }
.Colliding-Power-5-hex { color: #EF6024; }

/* Color Theme Swatches in RGBA */
.Colliding-Power-1-rgba { color: rgba(54, 52, 49, 1); }
.Colliding-Power-2-rgba { color: rgba(24, 103, 116, 1); }
.Colliding-Power-3-rgba { color: rgba(144, 161, 156, 1); }
.Colliding-Power-4-rgba { color: rgba(239, 147, 31, 1); }
.Colliding-Power-5-rgba { color: rgba(239, 96, 35, 1); }

/* Color Theme Swatches in HSLA */
.Colliding-Power-1-hsla { color: hsla(30, 3, 20, 1); }
.Colliding-Power-2-hsla { color: hsla(188, 64, 27, 1); }
.Colliding-Power-3-hsla { color: hsla(165, 8, 59, 1); }
.Colliding-Power-4-hsla { color: hsla(33, 87, 53, 1); }
.Colliding-Power-5-hsla { color: hsla(17, 86, 53, 1); }

</style>

<!-- Usage example (put anywhere):
<template>
  <div @contextmenu.prevent="openMenu($event)">
    Right-click me
  </div>
  <ContextMenu :open="menu.open" :x="menu.x" :y="menu.y" @close="menu.open=false">
    <ul class="py-2" role="none">
      <li class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer" role="menuitem">Simple item</li>
      <li class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2" role="menuitem">
        <span class="i-lucide-copy size-4"></span>
        <span>Copy</span>
      </li>
      <li class="px-3 py-2">
        <button class="w-full rounded-lg border px-3 py-2 text-left text-sm">A full button inside</button>
      </li>
    </ul>
  </ContextMenu>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import ContextMenu from './ContextMenu.vue';

const menu = reactive({ open: false, x: 0, y: 0 });

function openMenu(e: MouseEvent) {
  menu.x = e.clientX;
  menu.y = e.clientY;
  menu.open = true;
}
</script>
-->

import { createApp } from 'vue';
import App from './App.vue';
import './assets/css/style.css';
import { loadLefffAssets } from './lefff/assets.ts';

(async() => {
  const spinnerContainer = document.getElementById('initial-spinner-container');

  if ((document as any).fonts?.ready) {
    await Promise.race([
      (document as any).fonts.ready,
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  } else {
    await new Promise(r => setTimeout(r, 300));
  }

  if (spinnerContainer) {
    if (spinnerContainer.style.display === 'none') {
      spinnerContainer.style.display = 'flex';
    }
  }

  try {
    await loadLefffAssets();
  } catch (error) {
    console.error('Failed to load LEFFF assets:', error);
    // On continue quand même; l’app pourra afficher une erreur au besoin.
  }

  const app = createApp(App);
  app.mount('#app');

  // Retirer le spinner une fois l’app montée.
  if (spinnerContainer) {
    spinnerContainer.style.opacity = '1';
    spinnerContainer.style.transition = 'opacity 180ms ease';
    requestAnimationFrame(() => {
      spinnerContainer.style.opacity = '0';
      setTimeout(() => spinnerContainer.remove(), 220);
    });
  }
})();

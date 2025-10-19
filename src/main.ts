import { createApp } from 'vue';
import App from './App.vue';
import './assets/css/style.css';
import { loadLefffAssets } from './lefff/assets.ts';

(async() => {
  const spinnerContainer = document.getElementById('initial-spinner-container');

  // Attendre les polices (styles prêts) avant de commencer le reste pour éviter blocage spinner.
  if ((document as any).fonts?.ready) {
    try {
      await Promise.race([
        (document as any).fonts.ready,
        new Promise(resolve => setTimeout(resolve, 2000)) // fallback si trop long
      ]);
    } catch (_) {
      // Ignorer erreurs fonts
    }
  } else {
    // Fallback navigateurs anciens
    await new Promise(r => setTimeout(r, 300));
  }

  // Maintenant charger les assets lourds en montrant le spinner.
  if (spinnerContainer) {
    // S'assurer qu'il est visible si script head n'a pas déjà fait son travail (ex: temps de polices long)
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

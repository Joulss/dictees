import { createApp } from 'vue';
import App from './App.vue';
import './assets/css/style.css';

(async() => {
  // Attendre que les fontes soient chargées avant de monter l'app
  if ((document as any).fonts?.ready) {
    await Promise.race([
      (document as any).fonts.ready,
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  }

  // Monter l'app (elle gère le spinner et le chargement des assets elle-même)
  createApp(App).mount('#app');
})();

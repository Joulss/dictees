import { createApp } from 'vue';
import App from './App.vue';
import './assets/css/style.css';
import { loadLefffAssets } from './lefff/assets.ts';

try {
  await loadLefffAssets();
  createApp(App).mount('#app');
} catch (error) {
  console.error('Failed to load LEFFF assets:', error);
}




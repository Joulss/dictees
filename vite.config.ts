import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwind from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async() => ({
  plugins: [
    vue(),
    tailwind(),
    vueDevTools()
  ],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen : false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server      : {
    port       : 1420,
    strictPort : true,
    host       : host || false,
    hmr        : host
      ? {
        protocol : 'ws',
        host,
        port     : 1421
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**']
    }
  },
  resolve: {
    mainFields : ['module'],
    alias      : {
      '@'      : `${path.resolve(__dirname, 'src')}`,
      '@tauri' : `${path.resolve(__dirname, 'src-tauri')}`,
      '@root'  : `${path.resolve(__dirname, '')}`
    }
  }
}));

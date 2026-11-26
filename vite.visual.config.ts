import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { fileURLToPath } from 'node:url';
const path = (value: string) => fileURLToPath(new URL(value, import.meta.url));
export default defineConfig({
  root: path('./src/test/visual'),
  plugins: [react(), svgr({ include: '**/*.svg' })],
  resolve: {
    alias: {
      '@tauri-apps/api/core': path('./src/test/visual/tauri.ts'),
      '@tauri-apps/api/event': path('./src/test/visual/tauri.ts'),
      '@tauri-apps/plugin-dialog': path('./src/test/visual/tauri.ts'),
    },
  },
  server: { host: '127.0.0.1', port: 5174, fs: { allow: [path('./')] } },
});

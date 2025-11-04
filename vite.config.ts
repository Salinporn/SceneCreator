import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/digitalhome/scenecreator/',
  server: {
    fs: {
      strict: false,
    },
  },
  build: {
    rollupOptions: {
      input: './index.html',
    },
  },
});

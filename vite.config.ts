import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        join: resolve(projectRoot, 'join/index.html'),
        privacy: resolve(projectRoot, 'privacy/index.html'),
        explorer: resolve(projectRoot, 'explorer/index.html'),
        topicalGuide: resolve(projectRoot, 'topical-guide/index.html'),
        new: resolve(projectRoot, 'new/index.html'),
        newExplorer: resolve(projectRoot, 'new/explorer/index.html'),
        newTopicalGuide: resolve(projectRoot, 'new/topical-guide/index.html'),
      },
    },
  },
})

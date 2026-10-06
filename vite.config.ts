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
        accountDeletion: resolve(projectRoot, 'account-deletion/index.html'),
        beta: resolve(projectRoot, 'beta/index.html'),
        explorer: resolve(projectRoot, 'explorer/index.html'),
        topicalGuide: resolve(projectRoot, 'topical-guide/index.html'),
        newSite: resolve(projectRoot, 'new-site/index.html'),
        newSiteV2: resolve(projectRoot, 'new/index.html'),
        marketingLessons: resolve(projectRoot, 'new/lessons/index.html'),
        marketingGroups: resolve(projectRoot, 'new/groups/index.html'),
        marketingExplorer: resolve(projectRoot, 'new/explorer/index.html'),
        marketingReader: resolve(projectRoot, 'new/reader/index.html'),
        marketingTopics: resolve(projectRoot, 'new/topical-guide/index.html'),
        marketingMore: resolve(projectRoot, 'new/more/index.html'),
        marketingLabs: resolve(projectRoot, 'new/labs/index.html'),
        marketingDownload: resolve(projectRoot, 'new/download/index.html'),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.json'],
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          wagmi: ['wagmi', '@tanstack/react-query', 'viem'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['wagmi', '@tanstack/react-query', 'viem', '@farcaster/miniapp-wagmi-connector'],
    exclude: ['@farcaster/miniapp-wagmi-connector/node_modules/viem']
  }
})
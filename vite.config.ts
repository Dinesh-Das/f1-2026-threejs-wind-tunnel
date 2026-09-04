import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true },
  build: {
    // The Three.js engine is intentionally a large vendor dependency. Keep the
    // warning threshold just above that known chunk so app-code regressions
    // still surface while avoiding a false-positive on the engine itself.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'scheduler', 'zustand'],
          three: ['three'],
          'react-three-fiber': ['@react-three/fiber'],
          'react-three-drei': ['@react-three/drei'],
          postprocessing: ['postprocessing', '@react-three/postprocessing'],
        },
      },
    },
  },
})

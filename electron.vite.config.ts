import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          view: resolve(__dirname, 'src/renderer/view.html')
        }
      }
    }
  }
})
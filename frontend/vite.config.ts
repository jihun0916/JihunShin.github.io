import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  // For GitHub Pages: 
  // - If using username.github.io, use base: '/'
  // - If using username.github.io/repo-name, use base: '/repo-name/'
  base: '/JihunShin.github.io/',
})

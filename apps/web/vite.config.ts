import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The GitHub Pages demo lives under /<repo>/. PITWALL_BASE is the bare repo name: a value
// starting with "/" gets rewritten into a Windows path by Git Bash.
const base = process.env.PITWALL_BASE ? `/${process.env.PITWALL_BASE}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
})

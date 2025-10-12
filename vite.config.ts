import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // This is the line to add. It tells the app its final address.
  base: '/subtitle2docx/', 
  plugins: [react()],
})
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    base: '/subtitle2docx/',
    plugins: [react()],
    // Add this build section to change the output folder
    build: {
        outDir: 'docs'
    }
});

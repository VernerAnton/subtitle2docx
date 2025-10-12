import { defineConfig } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
    // ...any other plugins or settings
    build: {
        outDir: 'docs' // Change the output folder to 'docs'
    },
    base: '/subtitle2docx/', // Set the correct base path
});

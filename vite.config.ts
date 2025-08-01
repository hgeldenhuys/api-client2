import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(), 
    reactRouter(), 
    tsconfigPaths(),
  ],
  define: {
    // Configure Monaco Editor to be bundled
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) {
            return 'monaco';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
}));

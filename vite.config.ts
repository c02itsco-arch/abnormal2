import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Strict rule: Code must access process.env.API_KEY.
      // We map VITE_GEMINI_API_KEY (from .env or Vercel Dashboard) to it.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
  };
});
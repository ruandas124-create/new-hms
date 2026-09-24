
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-ignore process is a node global available in the build script
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
    define: {
      // Define on process.env to satisfy strict Gemini SDK requirements and project logic
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.VITE_APPSCRIPT_URL': JSON.stringify(env.VITE_APPSCRIPT_URL || ""),
      'process.env.SENDGRID_API_KEY': JSON.stringify(env.SENDGRID_API_KEY || ""),
      // Maintain import.meta.env for standard Vite compatibility
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    }
  };
});


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
      proxy: {
        '/supabase-proxy': {
          target: env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://aeghhbrvlefahqdbnudc.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
          secure: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/supabase-proxy': {
          target: env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://aeghhbrvlefahqdbnudc.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
          secure: true,
        },
      },
    },
    define: {
      // Define on process.env to satisfy strict Gemini SDK requirements and project logic
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.VITE_APPSCRIPT_URL': JSON.stringify(env.VITE_APPSCRIPT_URL || ""),
      'process.env.SENDGRID_API_KEY': JSON.stringify(env.SENDGRID_API_KEY || ""),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || "https://aeghhbrvlefahqdbnudc.supabase.co"),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "https://aeghhbrvlefahqdbnudc.supabase.co"),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""),
      // Maintain import.meta.env for standard Vite compatibility
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    }
  };
});

// Archivo: vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // loadEnv(mode, process.cwd(), '') is also a valid way to load env variables
    const env = loadEnv(mode, '.', ''); 
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // <<< AÑADE ESTA LÍNEA >>>
        'process.env.VITE_MP_PUBLIC_KEY': JSON.stringify(env.VITE_MP_PUBLIC_KEY)
      },
      resolve: {
        // alias settings if you have them
      }
    };
});
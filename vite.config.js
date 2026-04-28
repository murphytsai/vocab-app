import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /<repo-name>/, so the asset base
// must match in production. Local dev (vite / vite preview) keeps "/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/WordBank/' : '/',
}));

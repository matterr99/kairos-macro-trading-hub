import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  // In development (vite dev/serve), always use root '/' so dev server, preview iframe, and assets resolve directly without 302 redirects.
  // In production build, use GitHub Actions repository path if deployed on GitHub Pages, or relative './'.
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const base = command === 'serve' ? '/' : (isGitHubActions ? '/kairos-macro-trading-hub/' : './');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

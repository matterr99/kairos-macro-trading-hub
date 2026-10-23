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
      // HMR is disabled in AI Studio (ignore WebSocket errors)
      hmr: false,
      watch: null,
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          tools: path.resolve(import.meta.dirname, 'tools.html'),
          research: path.resolve(import.meta.dirname, 'research.html'),
          academy: path.resolve(import.meta.dirname, 'academy.html'),
          valuation: path.resolve(import.meta.dirname, 'tools/valuation.html'),
          currencyStrength: path.resolve(import.meta.dirname, 'tools/currency-strength-engine.html'),
          calendar: path.resolve(import.meta.dirname, 'tools/calendar.html'),
          quantDesk: path.resolve(import.meta.dirname, 'tools/quant-desk.html'),
          quantDeskEs: path.resolve(import.meta.dirname, 'tools/quant-desk-es.html'),
          centralBanks: path.resolve(import.meta.dirname, 'tools/central-banks.html'),
          volatilityIndex: path.resolve(import.meta.dirname, 'tools/volatility-index.html'),
          riskCalculator: path.resolve(import.meta.dirname, 'tools/risk-calculator.html'),
          consensusFilter: path.resolve(import.meta.dirname, 'tools/consensus-filter-engine.html'),
        },
      },
    },
  };
});

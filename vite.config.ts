import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Local dev-server proxy for automated weekly economic calendar sync.
 * Fetches ForexFactory's free public weekly JSON feed server-side (no CORS, no API key)
 * and normalizes it into the exact Investing.com-compatible column schema:
 * ['Date', 'Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous']
 */
function kairosWeeklyCalendarProxy(): Plugin {
  return {
    name: 'kairos-weekly-calendar-proxy',
    configureServer(server) {
      server.middlewares.use('/api/weekly-calendar', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '/', 'http://localhost');
          const week = urlObj.searchParams.get('week') === 'next' ? 'next' : 'this';
          const feedUrl =
            week === 'next'
              ? 'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
              : 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

          const upstream = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'KairosMacroHub/3.0',
              Accept: 'application/json',
            },
          });

          if (!upstream.ok) {
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Upstream feed returned HTTP ${upstream.status}` }));
            return;
          }

          const rawItems = (await upstream.json()) as Array<{
            title?: string;
            country?: string;
            date?: string;
            impact?: string;
            forecast?: string;
            previous?: string;
            actual?: string;
          }>;

          const headers = ['Date', 'Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous'];
          const rows: string[][] = [headers];

          for (const item of rawItems || []) {
            const iso = String(item.date || '');
            let dateStr = '';
            let timeStr = '';
            if (iso.includes('T')) {
              const [dPart, tPart] = iso.split('T');
              dateStr = dPart;
              timeStr = (tPart || '').slice(0, 5);
            } else {
              dateStr = iso.slice(0, 10);
              timeStr = '00:00';
            }

            const rawCcy = String(item.country || '').toUpperCase().trim();
            const ccy = rawCcy === 'CNY' ? 'CNH' : rawCcy;
            const impact = String(item.impact || '');
            const eventTitle = String(item.title || '').trim();
            const actual = String(item.actual ?? '').trim();
            const forecast = String(item.forecast ?? '').trim();
            const previous = String(item.previous ?? '').trim();

            if (!eventTitle || !ccy) continue;
            rows.push([dateStr, timeStr, ccy, eventTitle, impact, actual, forecast, previous]);
          }

          const csvEscape = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
          const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');

          if (urlObj.searchParams.get('format') === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="kairos_weekly_calendar_${week}.csv"`);
            res.end(csv);
            return;
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              week,
              count: rows.length - 1,
              fetchedAt: new Date().toISOString(),
              rows,
              csv,
            })
          );
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err?.message || 'Failed to fetch weekly calendar feed',
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ command }) => {
  // In development (vite dev/serve), always use root '/' so dev server, preview iframe, and assets resolve directly without 302 redirects.
  // In production build, use GitHub Actions repository path if deployed on GitHub Pages, or relative './'.
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const base = command === 'serve' ? '/' : (isGitHubActions ? '/kairos-macro-trading-hub/' : './');

  return {
    base,
    plugins: [react(), tailwindcss(), kairosWeeklyCalendarProxy()],
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

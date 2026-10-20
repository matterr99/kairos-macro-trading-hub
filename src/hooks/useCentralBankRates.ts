import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FredObservationsResponse,
  CentralBankRateData,
  CentralBankSeriesConfig,
} from '../types/centralBank';
import {
  G10_CENTRAL_BANK_CONFIGS,
  calculatePolicyTone,
  calculateTrajectoryCurve,
} from '../utils/centralBankUtils';

interface UseCentralBankRatesResult {
  data: Record<string, CentralBankRateData>;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isLiveConnected: boolean;
  liveCount: number;
  lastUpdated: Date | null;
}

const CACHE_KEY = 'kairos_fred_central_bank_rates_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute institutional cache

export function useCentralBankRates(): UseCentralBankRatesResult {
  const [data, setData] = useState<Record<string, CentralBankRateData>>(() => {
    // Generate default baseline data immediately
    const baseline: Record<string, CentralBankRateData> = {};
    for (const config of G10_CENTRAL_BANK_CONFIGS) {
      const latestRate = config.fallbackRate;
      const previousRate = config.fallbackPreviousRate;
      const impliedRate = Number((latestRate + config.impliedOffset).toFixed(2));
      const deltaBps = Number(((impliedRate - latestRate) * 100).toFixed(1));
      const step = config.step;
      const prob = Math.min(100, Math.round((Math.abs(deltaBps) / (step * 100)) * 100));
      const outcome = deltaBps > step * 50 ? 'HIKE' : deltaBps < -step * 50 ? 'CUT' : 'HOLD';
      const tone = calculatePolicyTone(latestRate, previousRate, impliedRate, outcome);
      const trajectory = calculateTrajectoryCurve(latestRate, impliedRate, step);

      baseline[config.code] = {
        code: config.code,
        name: config.name,
        currency: config.currency,
        seriesId: config.seriesId,
        latestRate,
        previousRate,
        latestDate: '2026-10-01',
        previousDate: '2026-09-01',
        momDeltaBps: Number(((latestRate - previousRate) * 100).toFixed(1)),
        forwardDeltaBps: deltaBps,
        nextMeeting: config.nextMeeting,
        step,
        impliedRate,
        prob,
        outcome,
        policyTone: tone,
        trajectory,
        isLive: false,
      };
    }
    return baseline;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Fetches latest observations for a given central bank through the secure backend proxy
   * Endpoint: /api/fred?series_id={seriesId}
   * Supports graceful fallbacks when hosted statically (e.g. GitHub Pages returning 404).
   */
  const fetchSingleSeries = async (
    config: CentralBankSeriesConfig
  ): Promise<{ latestRate: number; previousRate: number | null; latestDate: string; previousDate: string | null } | null> => {
    const seriesList = [config.seriesId];
    if (config.secondarySeriesId) {
      seriesList.push(config.secondarySeriesId);
    }

    const isDaily = config.seriesId === 'DFF';
    // Request up to 35 observations to ensure at least 20 trading days are available for daily series
    const limitParam = isDaily ? '&limit=35' : '&limit=10';

    for (const sid of seriesList) {
      try {
        const res = await fetch(`/api/fred?series_id=${encodeURIComponent(sid)}${limitParam}`, {
          headers: { Accept: 'application/json' },
        });

        // If backend proxy returns non-200 (e.g. 404 on GitHub Pages, 503 if no server key, or 429), skip and fallback
        if (!res.ok) {
          continue;
        }

        const json: FredObservationsResponse = await res.json();
        if (json && Array.isArray(json.observations) && json.observations.length > 0) {
          // Filter out missing/holiday entries (marked as '.' in FRED observations)
          const valid = json.observations.filter(
            (o) => o.value && o.value !== '.' && !isNaN(parseFloat(o.value))
          );

          if (valid.length > 0) {
            const latestRate = parseFloat(valid[0].value);
            const latestDate = valid[0].date;

            // For daily series (DFF), select an observation offset by ~20 trading days (~1 month)
            // For monthly series, valid[1] is already the previous month
            const prevIdx = isDaily
              ? (valid.length > 20 ? 20 : valid.length - 1)
              : 1;

            const previousRate = valid.length > prevIdx && prevIdx > 0 ? parseFloat(valid[prevIdx].value) : null;
            const previousDate = valid.length > prevIdx && prevIdx > 0 ? valid[prevIdx].date : null;

            return { latestRate, previousRate, latestDate, previousDate };
          }
        }
      } catch {
        // Silently catch and fail over for static hosting (e.g. GitHub Pages)
      }
    }

    return null;
  };

  const fetchRates = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    // Check cached session data if fresh
    try {
      const cachedStr = sessionStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const { timestamp, cachedData, cachedLiveCount } = JSON.parse(cachedStr);
        if (Date.now() - timestamp < CACHE_TTL_MS && cachedData) {
          setData(cachedData);
          setLiveCount(cachedLiveCount || 0);
          setLastUpdated(new Date(timestamp));
          setIsLoading(false);
          isFetchingRef.current = false;
          return;
        }
      }
    } catch {}

    const updatedMap: Record<string, CentralBankRateData> = {};
    let successfulFetches = 0;

    try {
      await Promise.all(
        G10_CENTRAL_BANK_CONFIGS.map(async (config) => {
          let latestRate = config.fallbackRate;
          let previousRate: number | null = config.fallbackPreviousRate;
          let latestDate = '2026-10-01';
          let previousDate: string | null = '2026-09-01';
          let isLive = false;

          try {
            const result = await fetchSingleSeries(config);
            if (result && !isNaN(result.latestRate)) {
              latestRate = Number(result.latestRate.toFixed(2));
              previousRate = result.previousRate !== null ? Number(result.previousRate.toFixed(2)) : null;
              latestDate = result.latestDate;
              previousDate = result.previousDate;
              isLive = true;
              successfulFetches++;
            }
          } catch {
            // Fail silently on static hosts (e.g. GitHub Pages) and preserve baseline fallbacks
          }

          const impliedRate = Number((latestRate + config.impliedOffset).toFixed(2));
          const deltaBps = Number(((impliedRate - latestRate) * 100).toFixed(1));
          const momDeltaBps = previousRate !== null ? Number(((latestRate - previousRate) * 100).toFixed(1)) : 0;
          const step = config.step;
          const prob = Math.min(100, Math.round((Math.abs(deltaBps) / (step * 100)) * 100));
          const outcome = deltaBps > step * 50 ? 'HIKE' : deltaBps < -step * 50 ? 'CUT' : 'HOLD';
          const tone = calculatePolicyTone(latestRate, previousRate, impliedRate, outcome);
          const trajectory = calculateTrajectoryCurve(latestRate, impliedRate, step);

          updatedMap[config.code] = {
            code: config.code,
            name: config.name,
            currency: config.currency,
            seriesId: config.seriesId,
            latestRate,
            previousRate,
            latestDate,
            previousDate,
            momDeltaBps,
            forwardDeltaBps: deltaBps,
            nextMeeting: config.nextMeeting,
            step,
            impliedRate,
            prob,
            outcome,
            policyTone: tone,
            trajectory,
            isLive,
          };
        })
      );

      setData(updatedMap);
      setLiveCount(successfulFetches);
      const now = new Date();
      setLastUpdated(now);

      // Save to cache if successful
      if (successfulFetches > 0) {
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: now.getTime(),
              cachedData: updatedMap,
              cachedLiveCount: successfulFetches,
            })
          );
        } catch {}
      }

      setIsError(false);
    } catch {
      // Fail silently on static hosts (e.g., GitHub Pages 404), keeping baseline fallback data intact
      setIsError(false);
      setError(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchRates,
    isLiveConnected: liveCount > 0,
    liveCount,
    lastUpdated,
  };
}

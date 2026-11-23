import { useMemo } from 'react';
import { CentralBankRateData } from '../types/centralBank';
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

export function useCentralBankRates(): UseCentralBankRatesResult {
  const data = useMemo(() => {
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
  }, []);

  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => {},
    isLiveConnected: false,
    liveCount: 0,
    lastUpdated: null,
  };
}

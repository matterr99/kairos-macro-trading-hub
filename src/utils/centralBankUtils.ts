import { CentralBankSeriesConfig, PolicyTone } from '../types/centralBank';

export const G10_CENTRAL_BANK_CONFIGS: CentralBankSeriesConfig[] = [
  {
    code: 'FED',
    name: 'Federal Reserve (FED)',
    currency: 'USD',
    seriesId: 'DFF', // Daily Federal Funds Effective Rate
    secondarySeriesId: 'FEDFUNDS',
    fallbackRate: 3.63,
    fallbackPreviousRate: 3.88,
    nextMeeting: '2026-11-04T14:00:00',
    step: 0.25,
    impliedOffset: 0.15,
  },
  {
    code: 'ECB',
    name: 'European Central Bank (ECB)',
    currency: 'EUR',
    seriesId: 'IRSTCB01EZM156N', // Euro Area Policy Rate (Immediate Rates)
    secondarySeriesId: 'ECBDFR',
    fallbackRate: 2.40,
    fallbackPreviousRate: 2.65,
    nextMeeting: '2026-10-22T14:15:00',
    step: 0.25,
    impliedOffset: 0.23,
  },
  {
    code: 'BOE',
    name: 'Bank of England (BOE)',
    currency: 'GBP',
    seriesId: 'IRSTCB01GBM156N', // Official Bank Rate for United Kingdom
    secondarySeriesId: 'IUDSOIA',
    fallbackRate: 3.75,
    fallbackPreviousRate: 4.00,
    nextMeeting: '2026-11-05T12:00:00',
    step: 0.25,
    impliedOffset: 0.12,
  },
  {
    code: 'RBA',
    name: 'Reserve Bank of Australia (RBA)',
    currency: 'AUD',
    seriesId: 'IRSTCB01AUM156N', // Cash Rate Target for Australia
    fallbackRate: 4.35,
    fallbackPreviousRate: 4.35,
    nextMeeting: '2026-11-03T14:30:00',
    step: 0.25,
    impliedOffset: 0.18,
  },
  {
    code: 'BOC',
    name: 'Bank of Canada (BOC)',
    currency: 'CAD',
    seriesId: 'IRSTCB01CAM156N', // Target Rate for Canada
    fallbackRate: 2.25,
    fallbackPreviousRate: 2.50,
    nextMeeting: '2026-10-28T10:00:00',
    step: 0.25,
    impliedOffset: 0.08,
  },
  {
    code: 'RBNZ',
    name: 'Reserve Bank of NZ (RBNZ)',
    currency: 'NZD',
    seriesId: 'IRSTCB01NZM156N', // Official Cash Rate for New Zealand
    fallbackRate: 2.50,
    fallbackPreviousRate: 2.75,
    nextMeeting: '2026-11-25T14:00:00',
    step: 0.25,
    impliedOffset: 0.14,
  },
  {
    code: 'BOJ',
    name: 'Bank of Japan (BOJ)',
    currency: 'JPY',
    seriesId: 'IRSTCB01JPM156N', // Policy Rate for Japan
    secondarySeriesId: 'INTDSRJPM193N',
    fallbackRate: 1.00,
    fallbackPreviousRate: 0.75,
    nextMeeting: '2026-10-30T12:00:00',
    step: 0.10,
    impliedOffset: 0.20,
  },
  {
    code: 'SNB',
    name: 'Swiss National Bank (SNB)',
    currency: 'CHF',
    seriesId: 'IRSTCB01CHM156N', // Policy Rate for Switzerland
    fallbackRate: 0.00,
    fallbackPreviousRate: 0.25,
    nextMeeting: '2026-12-10T09:30:00',
    step: 0.25,
    impliedOffset: 0.05,
  },
];

/**
 * Dynamic Policy Tone Classification Engine
 * Evaluates the policy stance by evaluating:
 * 1. MoM observation delta (most recent vs prior observation)
 * 2. Forward market implied delta (market pricing vs current rate)
 * 3. Meeting outcome projection (Hike, Cut, Hold)
 */
export function calculatePolicyTone(
  latestRate: number,
  previousRate: number | null,
  impliedRate: number,
  outcome: 'HIKE' | 'CUT' | 'HOLD'
): PolicyTone {
  const momDeltaBps = previousRate !== null ? Number(((latestRate - previousRate) * 100).toFixed(1)) : 0;
  const forwardDeltaBps = Number(((impliedRate - latestRate) * 100).toFixed(1));

  // If there was an aggressive actual rate hike (> 20 bps) or heavy forward tightening
  if (momDeltaBps >= 20 || forwardDeltaBps >= 25) {
    return {
      type: 'STRONGLY_HAWKISH',
      label: 'Strongly Hawkish',
      badgeClass: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50',
      score: 3,
      description: 'Active monetary tightening phase with aggressive rate hikes and upward revision to terminal rates.',
    };
  }

  // Moderate hike or positive forward pricing
  if (momDeltaBps > 5 || (outcome === 'HIKE' && forwardDeltaBps >= 10)) {
    return {
      type: 'HAWKISH',
      label: 'Hawkish Bias',
      badgeClass: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
      score: 2,
      description: 'Restrictive posture. Policy rate elevated relative to neutral with tightening lean.',
    };
  }

  // Hold with hawkish forward skew
  if (outcome === 'HOLD' && forwardDeltaBps > 5) {
    return {
      type: 'HAWKISH_HOLD',
      label: 'Hawkish Hold',
      badgeClass: 'text-teal-300 bg-teal-950/50 border-teal-500/30',
      score: 1,
      description: 'Rates held steady at higher levels; communication stresses higher-for-longer regime.',
    };
  }

  // Neutral hold / balanced data-dependent
  if (Math.abs(forwardDeltaBps) <= 5 && Math.abs(momDeltaBps) <= 5) {
    return {
      type: 'NEUTRAL',
      label: 'Data-Dependent',
      badgeClass: 'text-zinc-300 bg-zinc-800/60 border-zinc-700',
      score: 0,
      description: 'Balanced risks between growth and inflation; decision driven by high-frequency economic surprises.',
    };
  }

  // Hold with dovish forward easing
  if (outcome === 'HOLD' && forwardDeltaBps < -5) {
    return {
      type: 'DOVISH_HOLD',
      label: 'Dovish Hold',
      badgeClass: 'text-amber-300 bg-amber-950/50 border-amber-500/30',
      score: -1,
      description: 'Rates paused with guidance opening the door to imminent easing cycles.',
    };
  }

  // Rate cut in progress or moderate easing
  if (momDeltaBps <= -5 && momDeltaBps > -20 || (outcome === 'CUT' && forwardDeltaBps <= -10 && forwardDeltaBps > -25)) {
    return {
      type: 'DOVISH',
      label: 'Dovish Pivot',
      badgeClass: 'text-rose-300 bg-rose-950/50 border-rose-500/30',
      score: -2,
      description: 'Active easing trajectory; policy rates decreasing to support sovereign growth conditions.',
    };
  }

  // Aggressive rate cuts
  return {
    type: 'STRONGLY_DOVISH',
    label: 'Strongly Dovish',
    badgeClass: 'text-rose-400 bg-rose-950/80 border-rose-500/50',
    score: -3,
    description: 'Rapid monetary stimulus and emergency rate cuts to combat disinflation or recessionary pressure.',
  };
}

/**
 * Calculates a 5-point implied path trajectory curve
 */
export function calculateTrajectoryCurve(currentRate: number, impliedRate: number, step: number = 0.25): number[] {
  const delta = impliedRate - currentRate;
  const p0 = currentRate;
  const p1 = impliedRate;
  const p2 = Number((p1 + delta * 0.75).toFixed(2));
  const p3 = Number((p2 + delta * 0.50).toFixed(2));
  const p4 = Number((p3 + delta * 0.20).toFixed(2));
  return [Number(p0.toFixed(2)), Number(p1.toFixed(2)), p2, p3, p4];
}

/**
 * Computes human-friendly decision countdowns
 */
export function getMeetingCountdown(nextMeetingStr: string): {
  days: number;
  text: string;
  badgeClass: string;
} {
  const target = new Date(nextMeetingStr);
  const now = new Date();
  if (isNaN(target.getTime())) {
    return { days: 0, text: '--', badgeClass: 'bg-zinc-800 text-zinc-500' };
  }
  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 0) {
    return {
      days: diffDays,
      text: 'Passed',
      badgeClass: 'bg-zinc-900 text-zinc-500 border border-zinc-800',
    };
  } else if (diffHours <= 24) {
    return {
      days: 0,
      text: `<${diffHours}h left`,
      badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse font-bold',
    };
  } else if (diffDays <= 7) {
    return {
      days: diffDays,
      text: `${diffDays}d left`,
      badgeClass: 'bg-amber-950/50 text-amber-300 border border-amber-700 font-bold',
    };
  } else {
    return {
      days: diffDays,
      text: `${diffDays}d left`,
      badgeClass: 'bg-cyan-950/50 text-cyan-300 border border-cyan-800/60',
    };
  }
}

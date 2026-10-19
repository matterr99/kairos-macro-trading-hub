import { Language } from '../types';

export interface FredObservation {
  realtime_start?: string;
  realtime_end?: string;
  date: string;
  value: string;
}

export interface FredObservationsResponse {
  realtime_start?: string;
  realtime_end?: string;
  observation_start?: string;
  observation_end?: string;
  units?: string;
  output_type?: number;
  file_type?: string;
  order_by?: string;
  sort_order?: string;
  count?: number;
  offset?: number;
  limit?: number;
  observations: FredObservation[];
  error_code?: number;
  error_message?: string;
}

export type PolicyToneType =
  | 'STRONGLY_HAWKISH'
  | 'HAWKISH'
  | 'HAWKISH_HOLD'
  | 'NEUTRAL'
  | 'DOVISH_HOLD'
  | 'DOVISH'
  | 'STRONGLY_DOVISH';

export interface PolicyTone {
  type: PolicyToneType;
  label: string;
  badgeClass: string;
  score: number; // Institutional weight: -3 to +3
  description: string;
}

export interface CentralBankSeriesConfig {
  code: string;
  name: string;
  currency: string;
  seriesId: string;
  secondarySeriesId?: string;
  fallbackRate: number;
  fallbackPreviousRate: number;
  nextMeeting: string;
  step: number;
  impliedOffset: number;
}

export interface CentralBankRateData {
  code: string;
  name: string;
  currency: string;
  seriesId: string;
  latestRate: number;
  previousRate: number | null;
  latestDate: string;
  previousDate: string | null;
  momDeltaBps: number;
  forwardDeltaBps: number;
  nextMeeting: string;
  step: number;
  impliedRate: number;
  prob: number;
  outcome: 'HIKE' | 'CUT' | 'HOLD';
  policyTone: PolicyTone;
  trajectory: number[];
  isLive: boolean;
  error?: string;
}

export interface CentralBankTerminalProps {
  language?: Language;
  onSelectBank?: (code: string) => void;
  className?: string;
}

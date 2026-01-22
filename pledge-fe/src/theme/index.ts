import { PancakeTheme } from '@pancakeswap-libs/uikit/dist/theme';
import type { BreakpointChecks } from '../hooks/useMatchBreakpoints';
import type { Breakpoints, DevicesQueries, MediaQueries } from './types';

export interface PledgeTheme extends PancakeTheme {
  breakpoints: Breakpoints;
  mediaQueries: MediaQueries;
  devicesQueries?: DevicesQueries;
  breakpointChecks: BreakpointChecks;
}

export * from './types';

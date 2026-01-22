import { atom } from 'recoil';
import { DEFAULT_DEADLINE_FROM_NOW, INITIAL_ALLOWED_SLIPPAGE } from '_constants/index';
import DEFAULT_LIST from '_constants/token/pancakeswap.json';
import { TokenList } from '@uniswap/token-lists/dist/types';
import type { CurrencyInfos } from '../constants/currencyInfos';
import currencyInfos from '../constants/currencyInfos';

export const currencies = ['BSC_Mainnet', 'BSC_Testnet'] as const;

export type CurrencyType = (typeof currencies)[number];
const defaultChain = currencyInfos[0];

export const currencyState = atom<CurrencyType>({
  key: 'currencyState',
  default: 'BSC_Mainnet',
});

export type BalanceType = Record<CurrencyType, string>;
export const balanceState = atom<BalanceType>({
  key: 'balanceState',
  default: {
    BSC_Mainnet: '',
    BSC_Testnet: '',
  },
});
export const chainInfoState = atom<CurrencyInfos>({
  key: 'chainInfoState',
  default: defaultChain,
});

export const walletModalOpen = atom<boolean>({
  key: 'walletModalOpen',
  default: false,
});
export const userSlippageTolerance = atom<number>({
  key: 'userSlippageTolerance',
  default: INITIAL_ALLOWED_SLIPPAGE,
});
// 20 minutes, denominated in seconds

export const userDeadline = atom<number>({
  key: 'userDeadline',
  default: DEFAULT_DEADLINE_FROM_NOW,
});

export const useTokens = atom<TokenList>({
  key: 'useTokens',
  default: DEFAULT_LIST,
});

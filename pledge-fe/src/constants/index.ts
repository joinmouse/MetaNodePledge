import { ChainId, JSBI, Percent, Token, WETH } from '@pswww/sdk';
import { TESTNET_TOKEN_ADDRESSES } from './tokenAddresses';

export const ROUTER_ADDRESS = '0x1088d1860f4E51A2e20440eD23619a1D0D59beB0';

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[];
};

export const CAKE = new Token(ChainId.TESTNET, '0xEAEd08168a2D34Ae2B9ea1c1f920E0BC00F9fA67', 18, 'CAKE', 'CAKE');
export const WBNB = new Token(ChainId.TESTNET, TESTNET_TOKEN_ADDRESSES.WBNB, 18, 'WBNB', 'Wrapped BNB');
export const DAI = new Token(ChainId.TESTNET, TESTNET_TOKEN_ADDRESSES.DAI, 18, 'DAI', 'DAI');
export const BUSD = new Token(ChainId.TESTNET, TESTNET_TOKEN_ADDRESSES.BUSD, 18, 'BUSD', 'BUSD');
export const BTC = new Token(ChainId.TESTNET, TESTNET_TOKEN_ADDRESSES.BTCB, 18, 'BTCB', 'BTCB');
export const BNB = new Token(ChainId.TESTNET, '0x0000000000000000000000000000000000000000', 18, 'BNB', 'BNB');

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.TESTNET]: [WETH[ChainId.TESTNET]],
};

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.TESTNET]: [...WETH_ONLY[ChainId.TESTNET], DAI, BUSD, BTC, BNB],
};

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [ChainId.TESTNET]: {},
};

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.TESTNET]: [...WETH_ONLY[ChainId.TESTNET], DAI, BUSD, BTC],
};

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.TESTNET]: [...WETH_ONLY[ChainId.TESTNET], DAI, BUSD, BTC],
};

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [ChainId.TESTNET]: [
    [CAKE, WBNB],
    [BUSD, BTC],
    [DAI, BTC],
  ],
};

export const NetworkContextName = 'NETWORK';

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 80;
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20;

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000));
export const BIPS_BASE = JSBI.BigInt(10000);
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE); // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE); // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE); // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE); // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE); // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)); // .01 ETH

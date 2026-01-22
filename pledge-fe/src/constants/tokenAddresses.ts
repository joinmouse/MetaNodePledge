/**
 * 代币合约地址配置
 * 
 * 注意：如果重新部署了测试代币，需要更新此文件中的地址
 * 部署脚本位置：pledge-contract/scripts/deployTestTokens.js
 */

// BSC 主网代币地址 (ChainId: 56)
export const MAINNET_TOKEN_ADDRESSES = {
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
} as const;

// BSC 测试网代币地址 (ChainId: 97)
// 这些是我们自己部署的测试代币，支持 faucet_transfer 函数
export const TESTNET_TOKEN_ADDRESSES = {
  BUSD: '0x3428bFc1AC181205B91AC25B56136f1B59c55ae4',
  BTCB: '0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26',
  DAI: '0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5',
  USDT: '0x4A7A4be59fD51E998e737c0312b7582a88B53687',
  WBNB: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // BSC 测试网原生 WBNB
} as const;

// 根据链 ID 获取代币地址
export const getTokenAddresses = (chainId: number) => {
  switch (chainId) {
    case 56:
      return MAINNET_TOKEN_ADDRESSES;
    case 97:
      return TESTNET_TOKEN_ADDRESSES;
    default:
      return TESTNET_TOKEN_ADDRESSES;
  }
};

// 代币精度配置
export const TOKEN_DECIMALS = {
  BUSD: 18,
  DAI: 18,
  USDT: 18,
  BTCB: 18,
  WBNB: 18,
} as const;

// 代币名称配置
export const TOKEN_NAMES = {
  BUSD: 'Binance USD',
  DAI: 'Dai Stablecoin',
  USDT: 'Tether USD',
  BTCB: 'Bitcoin BEP20',
  WBNB: 'Wrapped BNB',
} as const;

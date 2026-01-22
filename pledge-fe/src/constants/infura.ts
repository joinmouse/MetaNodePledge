import { SupportedChainId } from './chains';
// if (typeof INFURA_KEY === 'undefined') {
//   throw new Error(`REACT_APP_INFURA_KEY must be a defined environment variable`)
// }

/**
 * These are the network URLs used by the interface when there is not another available source of chain data
 */
export const INFURA_NETWORK_URLS: { [key in SupportedChainId]: string } = {
  [SupportedChainId.MAINNET]: `https://bsc-rpc.publicnode.com`,

  [SupportedChainId.BSCTEST]: `https://bsc-testnet-rpc.publicnode.com`,
};

import Web3 from 'web3';
import { PledgePool, SendOptions } from '_src/contracts/PledgePool';
import { DebtToken } from '_src/contracts/DebtToken';
import { BscPledgeOracle } from '_src/contracts/BscPledgeOracle';
import { AddressPrivileges } from '_src/contracts/AddressPrivileges';
import { ERC20 } from '_src/contracts/ERC20';
import { IBEP20 } from '_src/contracts/IBEP20';
import type { PledgerBridgeBSC } from '_src/contracts/PledgerBridgeBSC';
import type { PledgerBridgeETH } from '_src/contracts/PledgerBridgeETH';

import type { Contract } from 'web3-eth-contract';

const PledgePoolAbi = require('_abis/PledgePool.json');
const DebtTokenAbi = require('_abis/DebtToken.json');
const BscPledgeOracleAbi = require('_abis/BscPledgeOracle.json');
const AddressPrivilegesAbi = require('_abis/AddressPrivileges.json');
const PledgerBridgeBSCAbi = require('_abis/PledgerBridgeBSC.json');
const PledgerBridgeETHAbi = require('_abis/PledgerBridgeETH.json');
const ERC20Abi = require('_abis/ERC20.json');
const IBEP20Abi = require('_abis/IBEP20.json');

interface SubContract<T> extends Contract {
  methods: T;
}

// 备用 RPC 配置（当 MetaMask 未连接时使用）
const FALLBACK_RPC_URLS = {
  97: 'https://bsc-testnet-rpc.publicnode.com', // BSC Testnet - PublicNode (已验证可用)
  56: 'https://bsc-rpc.publicnode.com', // BSC Mainnet - PublicNode
};

// 优先使用 MetaMask，如果未连接则使用备用 RPC
const getWeb3Provider = () => {
  if (Web3.givenProvider) {
    return Web3.givenProvider;
  }
  // 默认使用 BSC 测试网
  return FALLBACK_RPC_URLS[97];
};

const web3 = new Web3(getWeb3Provider());

const getPledgerBridgeBSC = (address?: string) =>
  new web3.eth.Contract(PledgerBridgeBSCAbi, address) as SubContract<PledgerBridgeBSC>;

const getPledgerBridgeETH = (address?: string) =>
  new web3.eth.Contract(PledgerBridgeETHAbi, address) as SubContract<PledgerBridgeETH>;
const getAddressPrivilegesContract = () =>
  new web3.eth.Contract(AddressPrivilegesAbi) as unknown as {
    methods: AddressPrivileges;
  };

const getBscPledgeOracleAbiContract = (address: string) =>
  new web3.eth.Contract(BscPledgeOracleAbi, address) as unknown as {
    methods: BscPledgeOracle;
  };

const getDebtTokenContract = (address: string) =>
  new web3.eth.Contract(DebtTokenAbi, address) as unknown as {
    methods: DebtToken;
  };

const getPledgePoolContract = (address: string) =>
  new web3.eth.Contract(PledgePoolAbi, address) as {
    methods: PledgePool;
  };
const getERC20Contract = (address: string) =>
  new web3.eth.Contract(ERC20Abi, address) as {
    methods: ERC20;
  };
const getIBEP20Contract = (address: string) =>
  new web3.eth.Contract(IBEP20Abi, address) as {
    methods: IBEP20;
  };
const getDefaultAccount = async () => {
  const accounts = await web3.eth.getAccounts();
  if (accounts.length > 0) {
    return accounts[0];
  }
  return '';
};

const gasOptions = async (params = {}): Promise<SendOptions> => {
  const from = await getDefaultAccount();

  if (!from) {
    console.error('[gasOptions] No account found. Please connect wallet.');
    throw new Error('No account connected. Please connect your wallet.');
  }

  console.log('[gasOptions] Using account:', from);

  try {
    // 获取当前 gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log('[gasOptions] Current gas price:', gasPrice, 'wei');

    // 如果没有提供 gasLimit，设置一个合理的默认值
    // depositLend 和其他合约交互通常需要 200000-500000 gas
    const gasLimit = params.gasLimit || 300000;
    console.log('[gasOptions] Using gas limit:', gasLimit);

    return {
      from,
      gasPrice,
      gas: gasLimit,
      ...params,
    };
  } catch (error) {
    console.error('[gasOptions] Error getting gas price:', error);
    // 如果获取 gas price 失败，只返回 from 地址，让 MetaMask 处理
    console.log('[gasOptions] Falling back to MetaMask auto-gas');
    return {
      from,
      ...params,
    };
  }
};
export {
  web3,
  getERC20Contract,
  gasOptions,
  getAddressPrivilegesContract,
  getBscPledgeOracleAbiContract,
  getDebtTokenContract,
  getPledgePoolContract,
  getDefaultAccount,
  getPledgerBridgeBSC,
  getPledgerBridgeETH,
  getIBEP20Contract,
};

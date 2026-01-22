import { AddEthereumChainParameter } from '_constants/ChainBridge.d';
import { pledge_address, pledge_mainaddress } from '_src/utils/constants';

import { gasOptions, getPledgePoolContract, getDefaultAccount } from './web3';

const PoolServer = {
  async poolLength() {
    const contract = getPledgePoolContract(pledge_address);
    const rates = await contract.methods.poolLength().call();
    return rates;
  },
  async getPoolBaseData() {
    const contract = getPledgePoolContract(pledge_address);
    const length = await contract.methods.poolLength().call();
    const poolbaseData = [];
    for (let i = 0; i < +length; i++) {
      const data = await contract.methods.poolBaseInfo(i.toString()).call();
      poolbaseData.push(data);
    }
    return poolbaseData;
  },
  async getPoolDataInfo() {
    const contract = getPledgePoolContract(pledge_address);
    const length = await contract.methods.poolLength().call();
    const poolDataData = [];
    for (let i = 0; i < +length; i++) {
      const data = await contract.methods.poolDataInfo(i.toString()).call();
      poolDataData.push(data);
    }
    return poolDataData;
  },

  async getuserLendInfo(pid: string, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const owner = await getDefaultAccount();
    const data = await contract.methods.userLendInfo(owner, pid).call();
    return await data;
  },
  async getuserBorrowInfo(pid: string, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const owner = await getDefaultAccount();
    const data = await contract.methods.userBorrowInfo(owner, pid).call();
    return await data;
  },
  async depositLend(pid, value, coinAddress, chainId) {
    console.log('[depositLend] Method called with:', {
      pid,
      value,
      coinAddress,
      chainId,
      contractAddress: chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
      isNativeToken: coinAddress === '0x0000000000000000000000000000000000000000',
    });

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 为 depositLend 设置适当的 gas limit
    // 这个操作涉及 token 转账和质押，通常需要 300000-500000 gas
    const options = await gasOptions({
      gasLimit: 400000, // 设置足够的 gas limit
    });

    // 如果是原生币（BNB），需要发送value
    if (coinAddress === '0x0000000000000000000000000000000000000000') {
      options.value = value;
      console.log('[depositLend] Adding native token value to options:', { value, options });
    } else {
      console.log('[depositLend] Using ERC20 token, value will be transferred via approve');
    }

    console.log('[depositLend] Sending transaction to contract with options:', options);

    try {
      const tx = await contract.methods.depositLend(pid, value).send(options);
      console.log('[depositLend] Transaction completed:', tx);
      return tx;
    } catch (error: any) {
      console.error('[depositLend] Transaction failed with error:', error);
      // 如果是 gas 相关错误，提供更多提示
      if (error?.message?.includes('gas required exceeds allowance')) {
        console.error('[depositLend] Gas limit too low. Increasing to 600000');
        options.gas = 600000;
        const tx = await contract.methods.depositLend(pid, value).send(options);
        console.log('[depositLend] Retry transaction completed:', tx);
        return tx;
      }
      throw error;
    }
  },
  async depositBorrow(pid, value, time, coinAddress, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    let options = await gasOptions();
    if (coinAddress === '0x0000000000000000000000000000000000000000') {
      options = { ...options, value };
    }
    const data = await contract.methods.depositBorrow(pid, value).send(options);
    return data;
  },
  async getclaimLend(pid: string, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.claimLend(pid).send(options);
    return data;
  },
  async getemergencyLendWithdrawal(pid, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.emergencyLendWithdrawal(pid).send(options);
    return data;
  },
  async getwithdrawLend(pid, value, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.withdrawLend(pid, value).send(options);
    return data;
  },
  async getrefundLend(pid, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.refundLend(pid).send(options);
    return data;
  },
  async getclaimBorrow(pid: string, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.claimBorrow(pid).send(options);
    return data;
  },
  async getemergencyBorrowWithdrawal(pid, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.emergencyBorrowWithdrawal(pid).send(options);
    return data;
  },
  async getwithdrawBorrow(pid, value, time, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.withdrawBorrow(pid, value).send(options);
    return data;
  },
  async getrefundBorrow(pid, chainId) {
    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );
    const options = await gasOptions();
    const data = await contract.methods.refundBorrow(pid).send(options);
    return data;
  },
  async switchNetwork(value: AddEthereumChainParameter) {
    try {
      return await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: value.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          return await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [value],
          });
        } catch (addError) {
          // handle "add" error
        }
      }
      if (switchError.code === 4001) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [],
        });
      }

      // handle other "switch" errors
    }
  },
  // async switchNetwork(value: BridgeConfigSimple) {
  //   return await window.ethereum.request({
  //     method: 'wallet_addEthereumChain',
  //     params: [
  //       {
  //         chainId: web3.utils.toHex(value.networkId),
  //         chainName: value.name,
  //         nativeCurrency: {
  //           name: value.nativeTokenSymbol,
  //           symbol: value.nativeTokenSymbol,
  //           decimals: value.decimals,
  //         },
  //         rpcUrls: [value.rpcUrl],
  //         blockExplorerUrls: [value.explorerUrl],
  //       } as AddEthereumChainParameter,
  //     ],
  //   });
  // },
};
export default PoolServer;

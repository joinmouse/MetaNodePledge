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

    // 验证池子是否存在
    try {
      console.log('[depositLend] Verifying pool exists for pid:', pid);
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      console.log('[depositLend] Pool info retrieved:', {
        lendToken: poolInfo.lendToken,
        borrowToken: poolInfo.borrowToken,
        state: poolInfo.state,
      });

      // 检查lendToken和borrowToken是否为零地址（池子可能已被删除）
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist or has been deleted. Please refresh the page to see available pools.`);
      }
    } catch (error: any) {
      console.error('[depositLend] Pool validation failed:', error);
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. The pool may have been deleted. Please refresh the page and try again.`);
    }

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

      // 处理池子不存在的错误
      if (error?.data?.message?.includes('pool does not exist') ||
          error?.message?.includes('pool does not exist')) {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page to see the updated pool list.`);
      }

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
    console.log('[depositBorrow] Method called with:', {
      pid,
      value,
      time,
      coinAddress,
      chainId,
      contractAddress: chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    });

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      console.log('[depositBorrow] Verifying pool exists for pid:', pid);
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      console.log('[depositBorrow] Pool info retrieved:', {
        lendToken: poolInfo.lendToken,
        borrowToken: poolInfo.borrowToken,
        state: poolInfo.state,
      });

      // 检查lendToken和borrowToken是否为零地址（池子可能已被删除）
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist or has been deleted. Please refresh the page to see available pools.`);
      }
    } catch (error: any) {
      console.error('[depositBorrow] Pool validation failed:', error);
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. The pool may have been deleted. Please refresh the page and try again.`);
    }

    let options = await gasOptions();
    if (coinAddress === '0x0000000000000000000000000000000000000000') {
      options = { ...options, value };
    }

    try {
      const data = await contract.methods.depositBorrow(pid, value).send(options);
      console.log('[depositBorrow] Transaction completed:', data);
      return data;
    } catch (error: any) {
      console.error('[depositBorrow] Transaction failed with error:', error);

      // 处理池子不存在的错误
      if (error?.data?.message?.includes('pool does not exist') ||
          error?.message?.includes('pool does not exist')) {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page to see the updated pool list.`);
      }

      throw error;
    }
  },
  async getclaimLend(pid: string, chainId) {
    console.log('[claimLend] Method called with pid:', pid);

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page.`);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. Please refresh the page.`);
    }

    const options = await gasOptions();
    const data = await contract.methods.claimLend(pid).send(options);
    console.log('[claimLend] Transaction completed:', data);
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
    console.log('[withdrawLend] Method called with pid:', pid);

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page.`);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. Please refresh the page.`);
    }

    const options = await gasOptions();
    const data = await contract.methods.withdrawLend(pid, value).send(options);
    console.log('[withdrawLend] Transaction completed:', data);
    return data;
  },
  async getrefundLend(pid, chainId) {
    console.log('[refundLend] Method called with pid:', pid);

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page.`);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. Please refresh the page.`);
    }

    const options = await gasOptions();
    const data = await contract.methods.refundLend(pid).send(options);
    console.log('[refundLend] Transaction completed:', data);
    return data;
  },
  async getclaimBorrow(pid: string, chainId) {
    console.log('[claimBorrow] Method called with pid:', pid);

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page.`);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. Please refresh the page.`);
    }

    const options = await gasOptions();
    const data = await contract.methods.claimBorrow(pid).send(options);
    console.log('[claimBorrow] Transaction completed:', data);
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
    console.log('[withdrawBorrow] Method called with pid:', pid);

    const contract = getPledgePoolContract(
      chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    );

    // 验证池子是否存在
    try {
      const poolInfo = await contract.methods.poolBaseInfo(pid).call();
      if (poolInfo.lendToken === '0x0000000000000000000000000000000000000000' &&
          poolInfo.borrowToken === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Pool with ID ${pid} does not exist. Please refresh the page.`);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist')) {
        throw error;
      }
      throw new Error(`Cannot access pool with ID ${pid}. Please refresh the page.`);
    }

    const options = await gasOptions();
    const data = await contract.methods.withdrawBorrow(pid, value).send(options);
    console.log('[withdrawBorrow] Transaction completed:', data);
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

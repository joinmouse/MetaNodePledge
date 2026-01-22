import { gasOptions, getERC20Contract, getDefaultAccount } from './web3';
import { pledge_address, ORACLE_address, pledge_mainaddress } from '_src/utils/constants';

const ERC20Server = {
  //获取余额
  async balanceOf(contractAddress) {
    const contract = getERC20Contract(contractAddress);
    const account = await getDefaultAccount();
    const rates = await contract.methods.balanceOf(account).call();
    return rates;
  },

  // 授权
  async Approve(contractAddress, amount, chainId) {
    console.log('[ERC20Server.Approve] Starting approval:', {
      contractAddress,
      amount,
      chainId,
      spenderAddress: chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress,
    });

    try {
      const contract = getERC20Contract(contractAddress);
      const options = await gasOptions();
      
      console.log('[ERC20Server.Approve] Gas options:', options);
      
      const spender = chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress;
      
      // 尝试手动指定 gas limit 来避免 MetaMask 估算失败
      const approveMethod = contract.methods.approve(spender, amount);
      
      console.log('[ERC20Server.Approve] Estimating gas...');
      let gasLimit;
      try {
        gasLimit = await approveMethod.estimateGas({ from: options.from });
        console.log('[ERC20Server.Approve] Estimated gas:', gasLimit);
      } catch (gasError: any) {
        console.warn('[ERC20Server.Approve] Gas estimation failed, using default:', gasError?.message);
        gasLimit = 100000; // 使用默认值
      }
      
      console.log('[ERC20Server.Approve] Sending transaction with gas limit:', gasLimit);
      
      const rates = await approveMethod.send({
        ...options,
        gas: gasLimit,
      });
      
      console.log('[ERC20Server.Approve] Approval successful:', {
        transactionHash: rates.transactionHash,
        blockNumber: rates.blockNumber,
        gasUsed: rates.gasUsed,
      });
      
      return rates;
    } catch (error: any) {
      console.error('[ERC20Server.Approve] Approval failed:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        contractAddress,
        amount,
        chainId,
      });
      throw error;
    }
  },
  //
  async allowance(contractAddress, chainId) {
    // sp_token \ jp_token
    const contract = getERC20Contract(contractAddress);
    const owner = await getDefaultAccount();
    return await contract.methods
      .allowance(owner, chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress)
      .call();
  },
  async getname(contractAddress) {
    const contract = getERC20Contract(contractAddress);
    const owner = await getDefaultAccount();
    return await contract.methods.symbol().call();
  },
};

export default ERC20Server;

import { pledge_address, pledge_mainaddress } from '_src/utils/constants';
import { gasOptions, getERC20Contract, getDefaultAccount } from './web3';

const ERC20Server = {
  // 获取余额
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
      const spender = chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress;

      // 为 approve 操作设置适当的 gas limit
      // approve 操作通常需要 50000-100000 gas
      const options = await gasOptions({
        gasLimit: 80000, // 设置足够的 gas limit
      });

      console.log('[ERC20Server.Approve] Gas options:', options);

      const approveMethod = contract.methods.approve(spender, amount);

      console.log('[ERC20Server.Approve] Sending transaction...');

      const rates = await approveMethod.send(options);

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

      // 如果是 gas 相关错误，提供更多提示
      if (error?.message?.includes('gas required exceeds allowance')) {
        console.error('[ERC20Server.Approve] Gas limit too low. Increasing to 150000');
        const contract = getERC20Contract(contractAddress);
        const spender = chainId == 97 ? pledge_address : chainId == 56 ? pledge_mainaddress : pledge_mainaddress;
        const options = await gasOptions({ gasLimit: 150000 });
        const rates = await contract.methods.approve(spender, amount).send(options);
        console.log('[ERC20Server.Approve] Retry approval successful:', rates);
        return rates;
      }

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

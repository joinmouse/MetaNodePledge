import { gasOptions, getIBEP20Contract } from './web3';
import type { IBEP20 } from '_src/contracts/IBEP20';
import { pledge_address, ORACLE_address } from '_src/utils/constants';

const IBEP20Server = {
  // 领取测试代币
  async getfaucet_transfer(contractAddress) {
    const contract = getIBEP20Contract(contractAddress);
    let options = await gasOptions();

    // faucet_transfer 无参数，合约内部使用 msg.sender 获取调用者地址
    const rates = await contract.methods.faucet_transfer().send(options);
    return rates;
  },

  // 检查用户是否可以领取代币
  async canClaim(contractAddress: string, userAddress: string): Promise<boolean> {
    const contract = getIBEP20Contract(contractAddress);
    const result = await contract.methods.canClaim(userAddress).call();
    return result;
  },

  // 获取距离下次可领取的剩余时间（秒）
  async getTimeUntilNextClaim(contractAddress: string, userAddress: string): Promise<number> {
    const contract = getIBEP20Contract(contractAddress);
    const result = await contract.methods.timeUntilNextClaim(userAddress).call();
    return Number(result);
  },
};

export default IBEP20Server;

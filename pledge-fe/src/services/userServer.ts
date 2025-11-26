import URL from '_constants/URL';
import axios from './dataProxy';
import mockData from './mockData.json';

// Mock开关：true=使用mock数据，false=调用真实API
const USE_MOCK = true;

/**
 * 用户中心服务
 */
const userServer = {
  /**
   * 获取池子基础信息
   * @param {number} chainId - 链ID
   */
  async getpoolBaseInfo(chainId: number) {
    if (USE_MOCK) {
      return mockData.poolBaseInfo;
    }
    return await axios.get(`${URL.info.poolBaseInfo}?chainId=${chainId}`);
  },
  
  /**
   * 获取池子数据信息
   * @param {number} chainId - 链ID
   */
  async getpoolDataInfo(chainId: number) {
    if (USE_MOCK) {
      return mockData.poolDataInfo;
    }
    return await axios.get(`${URL.info.poolDataInfo}?chainId=${chainId}`);
  },
};

export default userServer;

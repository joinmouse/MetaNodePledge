import { getApiUrl } from '../config/api.config';

// 使用统一配置获取代币列表URL
export const DEFAULT_TOKEN_LIST_URL = getApiUrl('/token?chainId=97');

export const DEFAULT_LIST_OF_LISTS: string[] = [
  getApiUrl('/token?chainId=97'),
  getApiUrl('/token?chainId=56'),
];

import { getBaseUrl } from '../config/api.config';

// 定义URL路径
const URLSource = {
  info: {
    poolBaseInfo: '/poolBaseInfo',
    poolDataInfo: '/poolDataInfo',
  },
};

// 代理监听 URL配置
const handler = {
  get(target, key) {
    // get 的trap 拦截get方法
    const value = target[key];

    try {
      return new Proxy(value, handler); // 使用try catch 巧妙的实现了 深层 属性代理
    } catch (err) {
      if (typeof value === 'string') {
        // 使用统一的配置获取基础URL
        const base = getBaseUrl();
        return base + value;
      }
    }
  },
  set(target, key) {
    // 阻止外部误操作，导致URL配置文件被修改，设置属性为只读属性
    try {
      return new Proxy(target[key], handler);
    } catch (err) {
      return true;
    }
  },
};

const URL = new Proxy(URLSource, handler);

export default URL;

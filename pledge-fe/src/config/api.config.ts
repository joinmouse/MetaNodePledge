// API配置统一管理
export interface ApiConfig {
  // 服务器配置
  serverHost: string;
  serverPort: number;

  // API版本
  apiVersion: string;

  // 环境配置
  environments: {
    development: string;
    production: string;
    local: string; // 本地代理路径
  };
}

// 统一的API配置
const API_CONFIG: ApiConfig = {
  // 服务器配置（暂时使用IP地址，因为DNS解析被拦截）
  serverHost: '111.230.6.64',
  serverPort: 8080,

  // API版本
  apiVersion: 'v22',

  // 环境配置
  environments: {
    development: 'http://111.230.6.64:8080',
    production: '', // Vercel部署时使用相对路径，通过rewrite代理
    local: '/api/v22', // 本地开发时通过webpack代理
  }
}

// 获取当前环境的基础URL
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return API_CONFIG.environments.development;
  }

  const host = window.location.hostname;

  // 本地开发环境 - 直接访问服务器
  if (host.includes('127.0.0.1') || host.includes('localhost')) {
    return `${API_CONFIG.environments.development}/api/${API_CONFIG.apiVersion}`;
  }

  // Vercel生产环境 - 使用相对路径，通过vercel.json的rewrite代理
  return `/api/${API_CONFIG.apiVersion}`;
};
// 获取完整的API URL
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// 获取服务器地址（用于webpack代理配置）
export const getServerUrl = (): string => `http://${API_CONFIG.serverHost}:${API_CONFIG.serverPort}`;

// 导出配置供其他模块使用
export default API_CONFIG;

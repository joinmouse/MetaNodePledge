// webpack配置辅助文件
// 由于webpack配置运行在Node.js环境，不能直接使用TypeScript模块
// 这里提供一个简单的配置对象供webpack使用

const API_CONFIG = {
  serverHost: '111.230.6.64',
  serverPort: 8080,
  apiVersion: 'v22',
};

// 获取服务器URL
const getServerUrl = () => {
  return `http://${API_CONFIG.serverHost}:${API_CONFIG.serverPort}`;
};

// 获取代理配置
const getProxyConfig = () => {
  const serverUrl = getServerUrl();
  return {
    '/api/v21': {
      target: serverUrl,
      changeOrigin: true,
      secure: false,
    },
    '/api/v22': {
      target: serverUrl,
      changeOrigin: true,
      secure: false,
    },
  };
};
module.exports = {
  API_CONFIG,
  getServerUrl,
  getProxyConfig,
};

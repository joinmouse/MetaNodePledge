# API配置统一管理

## 概述

为了更好地管理前端项目中的后端API地址配置，我们将所有相关配置统一到了一个配置文件中。

## 配置文件结构

### 1. 主配置文件
- **位置**: `src/config/api.config.ts`
- **作用**: 统一管理所有API相关配置
- **内容**: 服务器地址、端口、API版本、环境配置等

### 2. Webpack配置辅助文件
- **位置**: `build/config/api.config.js`
- **作用**: 为webpack开发服务器提供代理配置
- **内容**: 代理规则和服务器地址配置

## 配置使用

### 前端代码中使用
```typescript
import { getBaseUrl, getApiUrl } from '../config/api.config';

// 获取基础URL
const baseUrl = getBaseUrl();

// 获取完整的API URL
const tokenUrl = getApiUrl('/token?chainId=97');
```

### Webpack配置中使用
```javascript
const { getProxyConfig } = require('../config/api.config');

module.exports = {
  devServer: {
    proxy: {
      ...getProxyConfig(),
    },
  },
};
```

## 环境配置

### 本地开发环境
- 前端运行在: `http://localhost:8000`
- API请求通过webpack代理转发到: `http://111.230.6.64:8080`
- 代理路径: `/api/v22`

### 生产环境
- 直接访问服务器API: `http://111.230.6.64:8080/api/v22`

## 修改配置

如需修改服务器地址或端口，只需要修改以下两个文件：

1. `src/config/api.config.ts` - 前端配置
2. `build/config/api.config.js` - webpack配置

所有其他文件会自动使用新的配置。

## 优势

1. **统一管理**: 所有API地址配置集中在一个地方
2. **易于维护**: 修改服务器地址只需要改动配置文件
3. **环境隔离**: 自动根据运行环境选择合适的API地址
4. **类型安全**: TypeScript提供类型检查和智能提示
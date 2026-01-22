# BSC 测试网 RPC 故障排查指南

## 🔍 常见错误

### 错误 1: "Failed to fetch" (错误代码: -32603)

**错误信息示例：**
```json
{
  "code": -32603,
  "message": "Failed to fetch",
  "stack": "Error: Failed to fetch at new o (chrome-extension://...)"
}
```

**原因：**
- MetaMask 无法连接到配置的 RPC 节点
- RPC 节点不可用或网络连接问题
- RPC 节点限流或过载

---

## ✅ 解决方案

### 方案 1：手动更新 MetaMask RPC 节点（推荐）

1. **打开 MetaMask 钱包**
2. **点击网络下拉菜单** → 选择 "Binance Smart Chain Testnet"
3. **点击设置** → "网络" → 找到 "BSC Testnet"
4. **编辑网络**，将 RPC URL 更改为以下任一节点：

#### 🌐 可用的 BSC 测试网 RPC 节点（按优先级排序）

| 优先级 | RPC URL | 状态 | 说明 |
|--------|---------|------|------|
| ⭐⭐⭐ | `https://endpoints.omniatech.io/v1/bsc/testnet/public` | ✅ 可用 | 推荐使用 |
| ⭐⭐ | `https://bsc-testnet-rpc.publicnode.com` | ⚠️ 不稳定 | 备用 |
| ⭐⭐ | `https://data-seed-prebsc-1-s1.binance.org:8545` | ⚠️ SSL问题 | 官方节点 |
| ⭐ | `https://data-seed-prebsc-2-s1.binance.org:8545` | ⚠️ SSL问题 | 官方节点 |
| ❌ | `https://bsc-testnet.public.blastapi.io` | ❌ 已停用 | 不可用 |

5. **保存设置**
6. **刷新页面**（Cmd+Shift+R 或 Ctrl+Shift+R）

---

### 方案 2：测试 RPC 节点可用性

使用以下命令测试 RPC 节点是否可用：

```bash
# 测试 Omniatech 节点
curl -X POST https://endpoints.omniatech.io/v1/bsc/testnet/public \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 测试 PublicNode 节点
curl -X POST https://bsc-testnet-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**预期响应：**
```json
{"jsonrpc":"2.0","id":1,"result":"0x..."}
```

---

### 方案 3：验证合约地址

确认 BUSD 合约地址是否有效：

```bash
# 查询合约代码
curl -X POST https://endpoints.omniatech.io/v1/bsc/testnet/public \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x3428bFc1AC181205B91AC25B56136f1B59c55ae4","latest"],"id":1}'
```

**BUSD 合约地址：** `0x3428bFc1AC181205B91AC25B56136f1B59c55ae4`

---

## 🔧 前端配置文件

项目中已更新以下配置文件：

### 1. [`currencyInfos.ts`](/Users/frankwu/Project/MetaNodePledge/pledge-fe/src/constants/currencyInfos.ts)

```typescript
rpcUrls: [
  'https://endpoints.omniatech.io/v1/bsc/testnet/public',
  'https://bsc-testnet-rpc.publicnode.com',
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://data-seed-prebsc-2-s1.binance.org:8545'
]
```

### 2. [`infura.ts`](/Users/frankwu/Project/MetaNodePledge/pledge-fe/src/constants/infura.ts)

```typescript
[SupportedChainId.BSCTEST]: `https://endpoints.omniatech.io/v1/bsc/testnet/public`
```

### 3. [`ChainBridge.ts`](/Users/frankwu/Project/MetaNodePledge/pledge-fe/src/constants/ChainBridge.ts)

```typescript
rpcUrl: 'https://endpoints.omniatech.io/v1/bsc/testnet/public'
```

---

## 🐛 调试步骤

### 1. 检查 MetaMask 网络配置

```javascript
// 在浏览器 Console 中执行
console.log('当前网络:', window.ethereum.networkVersion);
console.log('当前账户:', await window.ethereum.request({ method: 'eth_accounts' }));
```

### 2. 检查 Web3 Provider

```javascript
// 在浏览器 Console 中执行
console.log('Provider:', window.ethereum);
console.log('ChainId:', await window.ethereum.request({ method: 'eth_chainId' }));
```

### 3. 测试 RPC 连接

```javascript
// 在浏览器 Console 中执行
const response = await fetch('https://endpoints.omniatech.io/v1/bsc/testnet/public', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
  })
});
console.log('RPC 响应:', await response.json());
```

---

## 📋 常见问题 FAQ

### Q1: 为什么会出现 "Failed to fetch" 错误？

**A:** 这通常是因为：
1. MetaMask 配置的 RPC 节点不可用
2. 网络连接问题
3. RPC 节点限流

**解决方法：** 更换 RPC 节点（见上方方案 1）

---

### Q2: 如何确认 RPC 节点是否可用？

**A:** 使用 curl 命令测试（见方案 2）

---

### Q3: 更换 RPC 节点后还是失败怎么办？

**A:** 尝试以下步骤：
1. 清除浏览器缓存
2. 重启 MetaMask
3. 检查网络连接
4. 尝试其他 RPC 节点
5. 检查防火墙设置

---

### Q4: 为什么 Binance 官方节点有 SSL 问题？

**A:** 某些系统的 SSL/TLS 版本较旧，不支持官方节点的加密协议。建议使用 Omniatech 节点。

---

## 🔗 相关资源

- [BSC 测试网浏览器](https://testnet.bscscan.com)
- [BSC 官方文档](https://docs.bnbchain.org/docs/rpc)
- [MetaMask 文档](https://docs.metamask.io)
- [ChainList - BSC Testnet](https://chainlist.org/?search=bsc+testnet)

---

## 📝 更新日志

- **2025-12-19**: 初始版本，添加 Omniatech RPC 节点
- **2025-12-19**: 移除不可用的 Blast API 节点
- **2025-12-19**: 验证 BUSD 合约地址有效性

---

## 💡 提示

如果以上方案都无法解决问题，请：
1. 检查 MetaMask 版本是否最新
2. 尝试使用其他浏览器
3. 联系技术支持并提供完整的错误日志

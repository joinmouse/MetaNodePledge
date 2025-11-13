# MultiSignature 多签钱包合约

## 📖 简介

这是一个极简的多签钱包合约，用于演示多签治理的核心概念。合约代码不到100行，非常适合学习和理解多签机制。

## 🎯 核心概念

**多签钱包**：需要多个所有者共同确认才能执行交易的钱包。

### 工作流程

```
1. 提交交易 (submit)    → 任意所有者提交一个待执行的交易
2. 确认交易 (confirm)   → 其他所有者逐个确认这个交易
3. 执行交易 (execute)   → 当确认数达到要求时，执行交易
4. 撤销确认 (revoke)    → 在执行前，所有者可以撤销自己的确认
```

## 🔧 合约功能

### 核心函数

| 函数 | 说明 | 权限 |
|------|------|------|
| `submit(to, value, data)` | 提交新交易 | 仅所有者 |
| `confirm(txId)` | 确认交易 | 仅所有者 |
| `execute(txId)` | 执行交易 | 仅所有者 |
| `revoke(txId)` | 撤销确认 | 仅所有者 |
| `getTransactionCount()` | 获取交易总数 | 任何人 |

### 状态变量

- `owners`: 所有者地址列表
- `required`: 执行交易所需的最少确认数
- `transactions`: 所有交易记录

## 📝 使用示例

### 1. 部署合约

```javascript
// 3个所有者，需要2个确认
const owners = [addr1, addr2, addr3];
const required = 2;
const multiSig = await MultiSignature.deploy(owners, required);
```

### 2. 提交交易

```javascript
// owner1 提交一个转账交易
await multiSig.connect(owner1).submit(
  recipientAddress,           // 接收地址
  ethers.parseEther("1"),    // 转账金额
  "0x"                       // 调用数据（转账时为空）
);
```

### 3. 确认交易

```javascript
// owner1 确认交易0
await multiSig.connect(owner1).confirm(0);

// owner2 确认交易0
await multiSig.connect(owner2).confirm(0);
```

### 4. 执行交易

```javascript
// 确认数达到要求后，任意所有者可以执行
await multiSig.connect(owner1).execute(0);
```

### 5. 撤销确认（可选）

```javascript
// 在执行前，owner1 可以撤销自己的确认
await multiSig.connect(owner1).revoke(0);
```

## 🧪 运行测试

```bash
# 运行所有测试
npx hardhat test test/MultiSignature.test.js

# 查看测试覆盖率
npx hardhat coverage
```

## 🚀 部署合约

```bash
# 部署到本地网络
npx hardhat ignition deploy ./ignition/modules/MultiSignature.js

# 部署到测试网（需要配置网络）
npx hardhat ignition deploy ./ignition/modules/MultiSignature.js --network sepolia
```

## 💡 学习要点

### 1. 权限控制
- 使用 `onlyOwner` 修饰器确保只有所有者能操作
- 使用 `mapping(address => bool)` 快速检查权限

### 2. 状态管理
- 使用 `struct` 组织交易数据
- 使用嵌套 `mapping` 记录确认状态

### 3. 安全检查
- 检查交易是否存在
- 检查交易是否已执行
- 检查是否重复确认

### 4. 事件记录

- 每个关键操作都发出事件
- 方便前端监听和链下追踪

## 🔒 安全注意事项

⚠️ **这是一个教学合约，实际生产环境需要考虑更多安全因素：**

1. **重入攻击防护**：添加 ReentrancyGuard
2. **所有者管理**：添加增删所有者的功能
3. **紧急暂停**：添加暂停机制
4. **Gas优化**：优化存储和循环
5. **审计**：生产环境必须经过专业审计

## 📚 扩展阅读

- [Gnosis Safe](https://github.com/safe-global/safe-contracts) - 生产级多签钱包
- [OpenZeppelin](https://docs.openzeppelin.com/) - 安全的合约库
- [Solidity文档](https://docs.soliditylang.org/) - Solidity官方文档

## 🤝 与项目集成

在 MetaNodePledge 项目中，MultiSignature 合约用于：

- 管理 PledgePool 的关键参数
- 控制 Oracle 价格更新权限
- 管理 AddressPrivileges 权限配置

详见项目主 README 中的架构图。
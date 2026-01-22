# 🎯 项目概述

Pledge 是一个去中心化固定利率借贷协议，核心特点：

💰 固定利率借贷：提供稳定的借贷利率

🔒 超额抵押：通过质押率保证系统安全

⚡ 自动清算：价格波动时自动触发清算保护

🏛️ 多签治理：关键操作需要多签确认

## 合约架构逻辑

- **PoolStorage**：存储层

- **PoolLendBorrow**：核心借贷逻辑（Admin + Lend + Borrow）

- **PledgePool**：主合约，整合所有功能模块（Settle + Swap + Fee + Liquidation）

## PledgePool 合约的功能

### 🏊‍♂️ 资金池管理

- **createPoolInfo()** - 创建新的借贷资金池，设置利率、质押率、时间等参数
- **poolBaseInfo()** - 获取资金池基础信息（时间、利率、供应量、状态等）
- **poolDataInfo()** - 获取资金池数据信息（结算金额、完成金额、清算金额）
- **poolLength()** - 获取资金池总数量

### 👥 用户信息查询

- **userLendInfo()** - 查询用户在指定资金池的出借信息
- **userBorrowInfo()** - 查询用户在指定资金池的借贷信息

### 💰 费用管理

- **setFee()** - 设置借贷手续费率（需要多签）
- **setFeeAddress()** - 设置手续费接收地址（需要多签）
- **setMinAmount()** - 设置最小操作金额（需要多签）

### 🔒 系统控制

- **setPause()** - 暂停/恢复系统（需要多签）
- **setSwapRouterAddress()** - 设置DEX路由地址（需要多签）

### ⚖️ 结算管理

- **checkoutSettle()** - 检查资金池是否可以结算
- **settle()** - 执行资金池结算（需要多签）
- **checkoutFinish()** - 检查资金池是否可以完成
- **finish()** - 执行资金池完成（需要多签）

### 🚨 清算管理

- **calculateHealthFactor()** - 计算资金池健康因子
- **checkoutLiquidate()** - 检查资金池是否可以清算
- **canLiquidate()** - 判断资金池是否达到清算条件
- **liquidate()** - 执行资金池清算
- **getLiquidationInfo()** - 获取清算相关信息

### 🔧 核心参数

- **LIQUIDATION_PENALTY** = 1000 (10%) - 清算罚金率
- **LIQUIDATION_REWARD** = 500 (5%) - 清算奖励率

## 核心流程

1. **创建资金池** → 设置借贷参数 → 多签确认
2. **用户参与** → 出借/借贷 → 获得对应代币
3. **结算阶段** → 到达结算时间 → 计算实际匹配金额
4. **执行阶段** → 借贷生效 → 计息开始
5. **完成/清算** → 到期自动完成 或 触发清算

---

## 🔗 快速参考

### 前端配置文件位置

需要更新合约地址的前端配置文件：

```typescript
// 主合约地址配置
pledge-fe/src/utils/constants.ts
  - pledge_address: PledgePool 合约地址
  - ORACLE_address: Oracle 合约地址

// 代币地址配置
pledge-fe/src/constants/tokenAddresses.ts
  - TESTNET_TOKEN_ADDRESSES: 测试代币地址映射
```

### 数据库配置

```sql
-- 数据库表：poolbases
-- 关键字段：
--   lend_token: PledgePool 合约地址
--   sp_coin: SP-Token 合约地址
--   jp_coin: JP-Token 合约地址
--   chain_id: 链ID (97 = BSC Testnet)
```

### 常用命令

```bash
# 部署主合约
npx hardhat ignition deploy ignition/modules/DeployPledgePool.js --network bscTestnet

# 验证合约
npx hardhat verify --network bscTestnet <合约地址> <构造参数>

# 更新数据库
./scripts/update-database.sh <PledgePool地址>

# 查看部署记录
cat ignition/deployments/chain-97/deployed_addresses.json
```

### 重要提醒

⚠️ **每次重新部署主合约后，必须执行以下操作：**

1. ✅ 更新前端配置文件 (`constants.ts`)
2. ✅ 更新数据库池子地址 (`update-database.sh`)
3. ✅ 重启前端服务 (`npm run dev`)
4. ✅ 重启后端服务 (`docker-compose restart`)
5. ✅ 清除浏览器缓存并刷新页面

---

## 🧪 测试代币部署

### BSC 测试网 (ChainId: 97)

项目已在 BSC 测试网部署了支持 Faucet 功能的测试代币，用户可以在前端页面免费领取进行测试。

#### 当前部署的测试代币地址

| 代币 | 合约地址 | 精度 |
|------|----------|------|
| **BUSD** | `0x3428bFc1AC181205B91AC25B56136f1B59c55ae4` | 18 |
| **BTCB** | `0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26` | 18 |
| **DAI** | `0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5` | 18 |
| **USDT** | `0x4A7A4be59fD51E998e737c0312b7582a88B53687` | 18 |

#### 如何重新部署测试代币

如果需要重新部署测试代币，请按照以下步骤操作：

**1. 配置环境变量**

在 `pledge-contract` 目录下创建 `.env` 文件：

```bash
# 你的钱包私钥（用于部署合约）
PRIVATE_KEY=你的私钥（不含0x前缀）
```

**2. 安装依赖**

```bash
cd pledge-contract
npm install
```

**3. 编译合约**

```bash
npx hardhat compile
```

**4. 部署测试代币**

```bash
npx hardhat run scripts/deployTestTokens.js --network bscTestnet
```

**5. 更新前端配置**

部署成功后，将输出的新合约地址更新到以下文件：

- `pledge-fe/src/constants/tokenAddresses.ts` - 代币地址常量文件（**主要配置**）
- `pledge-fe/src/constants/token/pancakeswap.json` - DEX 代币列表

#### 测试代币功能

- **faucet_transfer()** - 用户领取测试代币（每次 1000 个，24 小时冷却）
- **canClaim(address)** - 检查用户是否可以领取
- **timeUntilNextClaim(address)** - 查询距离下次可领取的时间

---

## 📁 项目配置文件说明

### 前端代币地址配置

代币地址统一配置在 `pledge-fe/src/constants/tokenAddresses.ts` 文件中：

```typescript
// BSC 测试网代币地址
export const TESTNET_TOKEN_ADDRESSES = {
  BUSD: '0x3428bFc1AC181205B91AC25B56136f1B59c55ae4',
  BTCB: '0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26',
  DAI: '0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5',
  USDT: '0x4A7A4be59fD51E998e737c0312b7582a88B53687',
  WBNB: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
};
```

> **注意**：如果重新部署了测试代币，只需更新此文件中的地址即可，其他文件会自动引用。

---

## 📋 合约部署信息汇总

### BSC 测试网 (ChainId: 97) - 完整部署清单

#### 核心合约

| 合约类型 | 合约名称 | 合约地址 | 部署时间 | BSCScan |
|---------|---------|---------|---------|---------|
| �️ **治理** | MultiSigWallet | `0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4` | 2025-12-18 | [查看](https://testnet.bscscan.com/address/0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4) |
| 🏊 **主合约** | PledgePool | `0x713A90b5E2B703Dc30307f0B872E5d666c42e40d` | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x713A90b5E2B703Dc30307f0B872E5d666c42e40d) |
| 📊 **预言机** | Oracle | `0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38` | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38) |

#### 测试代币

| 代币符号 | 代币名称 | 合约地址 | 精度 | BSCScan |
|---------|---------|---------|------|---------|
| **BUSD** | Binance USD | `0x3428bFc1AC181205B91AC25B56136f1B59c55ae4` | 18 | [查看](https://testnet.bscscan.com/address/0x3428bFc1AC181205B91AC25B56136f1B59c55ae4) |
| **BTCB** | Bitcoin BEP20 | `0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26` | 18 | [查看](https://testnet.bscscan.com/address/0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26) |
| **DAI** | Dai Stablecoin | `0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5` | 18 | [查看](https://testnet.bscscan.com/address/0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5) |
| **USDT** | Tether USD | `0x4A7A4be59fD51E998e737c0312b7582a88B53687` | 18 | [查看](https://testnet.bscscan.com/address/0x4A7A4be59fD51E998e737c0312b7582a88B53687) |

#### 出借凭证代币 (SP-Token)

| 代币符号 | 对应资产 | 合约地址 | BSCScan |
|---------|---------|---------|---------|
| **SP-BUSD** | BUSD | `0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED` | [查看](https://testnet.bscscan.com/address/0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED) |
| **SP-DAI** | DAI | `0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e` | [查看](https://testnet.bscscan.com/address/0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e) |
| **SP-USDT** | USDT | `0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D` | [查看](https://testnet.bscscan.com/address/0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D) |

#### 借款凭证代币 (JP-Token)

| 代币符号 | 对应资产 | 合约地址 | BSCScan |
|---------|---------|---------|---------|
| **JP-BUSD** | BUSD | `0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059` | [查看](https://testnet.bscscan.com/address/0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059) |
| **JP-DAI** | DAI | `0x6e41A2E76BA1d500c4569c707C5F2611dB12B393` | [查看](https://testnet.bscscan.com/address/0x6e41A2E76BA1d500c4569c707C5F2611dB12B393) |
| **JP-USDT** | USDT | `0x63e466D034e421499c59EA689f2B9D539EA59198` | [查看](https://testnet.bscscan.com/address/0x63e466D034e421499c59EA689f2B9D539EA59198) |

#### 外部依赖合约

| 合约名称 | 合约地址 | 说明 |
|---------|---------|------|
| **PancakeSwap Router V2** | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | DEX 路由合约 |
| **PancakeSwap Factory** | `0x6725F303b657a9451d8BA641348b6761A6CC7a17` | DEX 工厂合约 |
| **WBNB** | `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` | 包装 BNB |

---

## �🎫 债务凭证代币 (SP-Token / JP-Token)

### BSC 测试网 (ChainId: 97)

项目已在 BSC 测试网部署了借贷凭证代币，用于跟踪用户的出借和借款记录。

#### MultiSigWallet（多签钱包）
```
0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4
```

#### 主合约（PledgePool & Oracle）

| 合约名称 | 合约地址 | 功能说明 | 部署时间 | BSCScan |
|---------|---------|---------|---------|---------|
| **PledgePool** | `0x713A90b5E2B703Dc30307f0B872E5d666c42e40d` | 主借贷合约 | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x713A90b5E2B703Dc30307f0B872E5d666c42e40d) |
| **Oracle** | `0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38` | 价格预言机 | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38) |

> **部署说明**：合约已部署完成，如需重新部署可使用一键部署脚本
> ```bash
> cd pledge-contract
> ./scripts/deploy-and-configure.sh
> ```
> 
> **重要提示**：部署新合约后需要同步更新以下配置：
> - 前端配置文件：`pledge-fe/src/utils/constants.ts`
> - 数据库池子地址：执行 `./scripts/update-database.sh <新地址>`

#### SP-Token（出借方凭证）

| 代币 | 合约地址 | 用途 |
|------|----------|------|
| **SP-BUSD** | `0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED` | 出借 BUSD 获得的凭证 |
| **SP-DAI** | `0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e` | 出借 DAI 获得的凭证 |
| **SP-USDT** | `0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D` | 出借 USDT 获得的凭证 |

#### JP-Token（借款方凭证）

| 代币 | 合约地址 | 用途 |
|------|----------|------|
| **JP-BUSD** | `0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059` | 借 BUSD 的债务凭证 |
| **JP-DAI** | `0x6e41A2E76BA1d500c4569c707C5F2611dB12B393` | 借 DAI 的债务凭证 |
| **JP-USDT** | `0x63e466D034e421499c59EA689f2B9D539EA59198` | 借 USDT 的债务凭证 |

#### 部署命令

```bash
cd pledge-contract
npx hardhat run scripts/deployDebtTokens.js --network bscTestnet
```

#### 部署后配置

部署完成后，需要更新数据库中的池子信息：

```sql
-- 更新 BUSD 池子的 SP/JP Token 地址
UPDATE poolbases SET 
  sp_coin = '0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED',
  jp_coin = '0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059'
WHERE chain_id = '97' AND lend_token_symbol = 'BUSD';

-- 更新 DAI 池子的 SP/JP Token 地址
UPDATE poolbases SET 
  sp_coin = '0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e',
  jp_coin = '0x6e41A2E76BA1d500c4569c707C5F2611dB12B393'
WHERE chain_id = '97' AND lend_token_symbol = 'DAI';

-- 更新 USDT 池子的 SP/JP Token 地址
UPDATE poolbases SET 
  sp_coin = '0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D',
  jp_coin = '0x63e466D034e421499c59EA689f2B9D539EA59198'
WHERE chain_id = '97' AND lend_token_symbol = 'USDT';
```

---

## 🚀 主合约部署指南

### 快速部署（推荐）

使用一键部署脚本自动完成所有步骤：

```bash
cd pledge-contract

# 一键部署和配置
./scripts/deploy-and-configure.sh
```

脚本会自动完成：
1. ✅ 编译合约
2. ✅ 部署 PledgePool 和 Oracle
3. ✅ 配置合约参数（手续费、最小金额、DEX 路由等）
4. ✅ 配置 Oracle 价格源
5. ✅ 验证部署结果
6. ✅ 更新数据库配置

### 手动部署（分步执行）

如果需要更精细的控制，可以分步执行：

#### 1. 部署合约

```bash
npx hardhat ignition deploy ignition/modules/DeployPledgePool.js --network bscTestnet
```

记录输出的合约地址：
- PledgePool: `0x...`
- Oracle: `0x...`

#### 2. 配置 PledgePool

```bash
export PLEDGE_POOL_ADDRESS=<PledgePool地址>
export ORACLE_ADDRESS=<Oracle地址>
export MULTISIG_WALLET_ADDRESS=0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4

npx hardhat run scripts/configure-pledge-pool.js --network bscTestnet
```

配置内容：
- 借贷手续费率：0.25%
- 手续费接收地址
- 最小操作金额：1 BUSD
- DEX 路由地址：PancakeSwap V2 Router
- Oracle 地址

#### 3. 配置 Oracle

```bash
export ORACLE_ADDRESS=<Oracle地址>
export BUSD_ADDRESS=<BUSD地址>
export BTCB_ADDRESS=<BTCB地址>
export DAI_ADDRESS=<DAI地址>
export USDT_ADDRESS=<USDT地址>

npx hardhat run scripts/configure-oracle.js --network bscTestnet
```

配置内容：
- 设置各代币的初始价格
- 支持手动价格或 Chainlink Price Feed

#### 4. 验证部署

```bash
export PLEDGE_POOL_ADDRESS=<PledgePool地址>
export ORACLE_ADDRESS=<Oracle地址>

npx hardhat run scripts/verify-deployment.js --network bscTestnet
```

#### 5. 更新数据库

```bash
./scripts/update-database.sh <PledgePool地址>
```

#### 6. 在 BSCScan 上验证合约源码

```bash
npx hardhat verify --network bscTestnet <PLEDGE_POOL_ADDRESS> 0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4
npx hardhat verify --network bscTestnet <ORACLE_ADDRESS> 0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4
```

### 部署后配置

1. **更新 README.md**：将部署的合约地址填入上面的表格
2. **更新前端配置**：在前端项目中更新合约地址
3. **重启后端服务**：
   ```bash
   docker-compose restart pledge-backend
   ```
4. **测试功能**：在前端测试借贷功能是否正常

### 常见问题

**Q: 多签交易需要几个签名？**
A: 当前 MultiSigWallet 配置为需要 1 个签名即可执行（测试环境）。生产环境建议配置为 2/3 或 3/5。

**Q: 如何更新 Oracle 价格？**
A: 使用 `configure-oracle.js` 脚本中的 `updatePrice()` 函数：
```javascript
const { updatePrice } = require('./scripts/configure-oracle.js');
await updatePrice('BUSD', '1.01');
```

**Q: 如何回滚部署？**
A: 数据库更新脚本中包含回滚语句，取消注释并填入旧地址即可。

---

## 📚 相关文档

- [Hardhat 文档](https://hardhat.org/docs)
- [BSC 测试网水龙头](https://testnet.binance.org/faucet-smart)
- [PancakeSwap 测试网](https://pancake.kiemtienonline360.com/)
- [BSCScan 测试网](https://testnet.bscscan.com/)
```

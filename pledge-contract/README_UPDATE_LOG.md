# 📝 README 更新说明

**更新时间**: 2025-12-19 17:15:00  
**更新内容**: 添加 PledgePool 和 Oracle 合约部署信息

---

## ✅ 已完成的更新

### 1. 更新主合约部署信息

在 `README.md` 中更新了以下内容：

#### 主合约表格更新
- ✅ 填入 PledgePool 合约地址：`0x713A90b5E2B703Dc30307f0B872E5d666c42e40d`
- ✅ 填入 Oracle 合约地址：`0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38`
- ✅ 添加部署时间列：2025-12-19
- ✅ 更新 BSCScan 链接为实际地址

### 2. 新增合约部署信息汇总表

在 `README.md` 中新增了完整的部署清单，包括：

- **核心合约**：MultiSigWallet、PledgePool、Oracle
- **测试代币**：BUSD、BTCB、DAI、USDT（含 BSCScan 链接）
- **出借凭证代币 (SP-Token)**：SP-BUSD、SP-DAI、SP-USDT
- **借款凭证代币 (JP-Token)**：JP-BUSD、JP-DAI、JP-USDT
- **外部依赖合约**：PancakeSwap Router V2、Factory、WBNB

### 3. 新增快速参考部分

添加了以下实用信息：

- 📂 前端配置文件位置和说明
- 🗄️ 数据库配置字段说明
- ⚡ 常用命令速查
- ⚠️ 重新部署后的必要操作清单

### 4. 创建合约地址速查表

新建文件：`CONTRACT_ADDRESSES.md`

包含内容：
- 🎯 核心合约地址（纯文本格式，方便复制）
- 💰 测试代币地址
- 🎫 SP-Token 和 JP-Token 地址
- 🔧 外部依赖合约地址
- 📂 配置文件位置
- 🔗 BSCScan 快速链接
- ⚡ 常用命令
- 📝 部署历史记录

---

## 📊 更新对比

### 更新前
```markdown
| **PledgePool** | `待部署` | 主借贷合约 | [查看](https://testnet.bscscan.com/address/) |
| **Oracle** | `待部署` | 价格预言机 | [查看](https://testnet.bscscan.com/address/) |
```

### 更新后
```markdown
| **PledgePool** | `0x713A90b5E2B703Dc30307f0B872E5d666c42e40d` | 主借贷合约 | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x713A90b5E2B703Dc30307f0B872E5d666c42e40d) |
| **Oracle** | `0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38` | 价格预言机 | 2025-12-19 | [查看](https://testnet.bscscan.com/address/0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38) |
```

---

## 🔗 相关文件

### 已更新的文件
- ✅ `pledge-contract/README.md` - 主文档，添加详细部署信息
- ✅ `pledge-contract/CONTRACT_ADDRESSES.md` - 新建速查表

### 已同步的配置文件
- ✅ `pledge-fe/src/utils/constants.ts` - 前端合约地址配置
- ✅ 数据库 `poolbases` 表 - 36 个池子地址已更新

### 相关部署文档
- 📄 `DEPLOYMENT_SUMMARY.md` - 完整部署摘要
- 📄 `pledge-contract/ignition/deployments/chain-97/deployed_addresses.json` - Hardhat 部署记录

---

## 🎯 使用指南

### 快速查找合约地址

**方式 1：查看速查表（推荐）**
```bash
cat pledge-contract/CONTRACT_ADDRESSES.md
```

**方式 2：查看 README**
```bash
# 查看主合约部分
grep -A 10 "主合约（PledgePool & Oracle）" pledge-contract/README.md

# 查看完整部署清单
grep -A 50 "合约部署信息汇总" pledge-contract/README.md
```

**方式 3：查看部署摘要**
```bash
cat DEPLOYMENT_SUMMARY.md
```

### 验证合约地址

```bash
# 在 BSCScan 上查看
open https://testnet.bscscan.com/address/0x713A90b5E2B703Dc30307f0B872E5d666c42e40d

# 使用 Hardhat 验证
npx hardhat verify --network bscTestnet 0x713A90b5E2B703Dc30307f0B872E5d666c42e40d "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4"
```

---

## 📝 维护建议

### 每次重新部署后需要更新的文档

1. ✅ `README.md` - 主合约表格
2. ✅ `CONTRACT_ADDRESSES.md` - 速查表
3. ✅ `DEPLOYMENT_SUMMARY.md` - 部署摘要
4. ✅ 前端配置文件 `constants.ts`
5. ✅ 数据库 `poolbases` 表

### 建议的更新流程

```bash
# 1. 部署合约
./scripts/deploy-and-configure.sh

# 2. 记录新地址
export NEW_PLEDGE_POOL=<新地址>
export NEW_ORACLE=<新地址>

# 3. 更新文档（手动编辑）
# - README.md
# - CONTRACT_ADDRESSES.md
# - DEPLOYMENT_SUMMARY.md

# 4. 更新配置
./scripts/update-database.sh $NEW_PLEDGE_POOL

# 5. 提交更改
git add .
git commit -m "docs: update contract addresses after redeployment"
```

---

## 🎉 总结

本次更新完成了以下目标：

1. ✅ **填充了 README.md 中的待部署合约地址**
2. ✅ **新增了完整的合约部署信息汇总表**
3. ✅ **创建了独立的合约地址速查表文档**
4. ✅ **添加了快速参考和常用命令**
5. ✅ **提供了清晰的维护指南**

现在开发者可以通过以下方式快速查找合约地址：
- 📖 查看 `README.md` 获取详细信息
- ⚡ 查看 `CONTRACT_ADDRESSES.md` 快速复制地址
- 📊 查看 `DEPLOYMENT_SUMMARY.md` 了解部署详情

---

**文档版本**: 1.0  
**维护者**: 开发团队

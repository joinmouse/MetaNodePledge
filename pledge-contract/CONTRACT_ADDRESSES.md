# 📋 合约地址速查表

**网络**: BSC Testnet (ChainId: 97)  
**更新时间**: 2025-12-19 17:15:00

---

## 🎯 核心合约

```
MultiSigWallet:  0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4
PledgePool:      0x713A90b5E2B703Dc30307f0B872E5d666c42e40d
Oracle:          0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38
```

---

## 💰 测试代币

```
BUSD:  0x3428bFc1AC181205B91AC25B56136f1B59c55ae4
BTCB:  0xA70cA3e5a91Da9E8ef61c3a214f7d6D3ca03Be26
DAI:   0x5Bf9C25492AFF8990C7c16a1E70e22C136a42de5
USDT:  0x4A7A4be59fD51E998e737c0312b7582a88B53687
WBNB:  0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
```

---

## 🎫 出借凭证 (SP-Token)

```
SP-BUSD:  0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED
SP-DAI:   0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e
SP-USDT:  0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D
```

---

## 📝 借款凭证 (JP-Token)

```
JP-BUSD:  0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059
JP-DAI:   0x6e41A2E76BA1d500c4569c707C5F2611dB12B393
JP-USDT:  0x63e466D034e421499c59EA689f2B9D539EA59198
```

---

## 🔧 外部依赖

```
PancakeSwap Router V2:  0xD99D1c33F9fC3444f8101754aBC46c52416550D1
PancakeSwap Factory:    0x6725F303b657a9451d8BA641348b6761A6CC7a17
```

---

## 📂 配置文件位置

### 前端配置
```
pledge-fe/src/utils/constants.ts
  ├─ pledge_address: 0x713A90b5E2B703Dc30307f0B872E5d666c42e40d
  └─ ORACLE_address: 0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38

pledge-fe/src/constants/tokenAddresses.ts
  └─ TESTNET_TOKEN_ADDRESSES: { BUSD, BTCB, DAI, USDT, WBNB }
```

### 数据库配置
```sql
-- 表名: poolbases
-- 关键字段:
--   lend_token: 0x713A90b5E2B703Dc30307f0B872E5d666c42e40d (PledgePool)
--   sp_coin: SP-Token 地址
--   jp_coin: JP-Token 地址
--   chain_id: 97
```

---

## 🔗 BSCScan 链接

- [MultiSigWallet](https://testnet.bscscan.com/address/0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4)
- [PledgePool](https://testnet.bscscan.com/address/0x713A90b5E2B703Dc30307f0B872E5d666c42e40d)
- [Oracle](https://testnet.bscscan.com/address/0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38)

---

## ⚡ 快速命令

### 验证合约
```bash
npx hardhat verify --network bscTestnet 0x713A90b5E2B703Dc30307f0B872E5d666c42e40d "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4"
npx hardhat verify --network bscTestnet 0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38 "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4"
```

### 更新数据库
```bash
cd pledge-contract
./scripts/update-database.sh 0x713A90b5E2B703Dc30307f0B872E5d666c42e40d
```

### 重新部署
```bash
cd pledge-contract
./scripts/deploy-and-configure.sh
```

---

## 📝 部署历史

| 日期 | 合约 | 地址 | 说明 |
|------|------|------|------|
| 2025-12-19 | PledgePool | `0x713A90b5E2B703Dc30307f0B872E5d666c42e40d` | 初始部署 |
| 2025-12-19 | Oracle | `0x6b6B0803dFB0AF604a0CE7B98Fa4eF53Aa2Fbe38` | 初始部署 |
| 2025-12-18 | MultiSigWallet | `0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4` | 初始部署 |

---

## ⚠️ 重要提醒

**每次重新部署主合约后，必须执行：**

1. ✅ 更新前端 `constants.ts`
2. ✅ 执行 `update-database.sh`
3. ✅ 重启前端服务
4. ✅ 重启后端服务
5. ✅ 清除浏览器缓存

---

**详细文档**: 请查看 [README.md](./README.md)

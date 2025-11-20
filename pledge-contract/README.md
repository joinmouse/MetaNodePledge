# 🎯 项目概述

Pledge 是一个去中心化固定利率借贷协议，核心特点：

💰 固定利率借贷：提供稳定的借贷利率

🔒 超额抵押：通过质押率保证系统安全

⚡ 自动清算：价格波动时自动触发清算保护

🏛️ 多签治理：关键操作需要多签确认

## 合约架构逻辑

- **PoolStorage**：存储层

- **PoolLendBorrow**：核心借贷逻辑（Admin + Lend + Borrow）

- **PledgePool**：辅助功能和对外接口（Settle + Swap + Fee + Liquidation）
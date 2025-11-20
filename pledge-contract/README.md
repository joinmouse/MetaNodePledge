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

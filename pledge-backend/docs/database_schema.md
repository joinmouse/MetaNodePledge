# 数据库表结构文档

## 表统计

项目中总共使用了 **4张表**：

1. poolbases - 池子基础信息表
2. pooldata - 池子数据信息表  
3. multi_sign - 多签账户表
4. token_info - 代币信息表

## 详细表结构

### 1. poolbases 表

**表名**: poolbases  
**描述**: 存储借贷池的基础配置信息

| 字段名 | 类型 | 描述 | 备注 |
|--------|------|------|------|
| id | int | 主键ID | 自增 |
| pool_id | int | 池子ID | 唯一标识 |
| auto_liquidata_threshold | string | 自动清算阈值 | |
| borrow_supply | string | 借贷供应量 | |
| borrow_token | string | 借贷代币地址 | |
| borrow_token_info | string | 借贷代币信息(JSON) | 包含费用、logo、名称、价格 |
| end_time | string | 结束时间 | |
| interest_rate | string | 利率 | |
| jp_coin | string | JP代币地址 | |
| lend_supply | string | 出借供应量 | |
| lend_token | string | 出借代币地址 | |
| lend_token_info | string | 出借代币信息(JSON) | 包含费用、logo、名称、价格 |
| martgage_rate | string | 抵押率 | |
| max_supply | string | 最大供应量 | |
| settle_time | string | 结算时间 | |
| sp_coin | string | SP代币地址 | |
| state | string | 状态 | |

### 2. pooldata 表

**表名**: pooldata  
**描述**: 存储池子的实时数据信息

| 字段名 | 类型 | 描述 | 备注 |
|--------|------|------|------|
| id | int | 主键ID | 自增 |
| pool_id | int | 池子ID | 外键关联poolbases |
| chain_id | string | 链ID | |
| finish_amount_borrow | string | 完成的借贷金额 | |
| finish_amount_lend | string | 完成的出借金额 | |
| liquidation_amoun_borrow | string | 清算的借贷金额 | |
| liquidation_amoun_lend | string | 清算的出借金额 | |
| settle_amount_borrow | string | 结算的借贷金额 | |
| settle_amount_lend | string | 结算的出借金额 | |
| created_at | string | 创建时间 | |
| updated_at | string | 更新时间 | |

### 3. multi_sign 表

**表名**: multi_sign  
**描述**: 存储多签账户配置信息

| 字段名 | 类型 | 描述 | 备注 |
|--------|------|------|------|
| id | int32 | 主键ID | |
| sp_name | string | SP名称 | |
| chain_id | int | 链ID | |
| sp_token | string | SP代币 | |
| jp_name | string | JP名称 | |
| jp_token | string | JP代币 | |
| sp_address | string | SP地址 | |
| jp_address | string | JP地址 | |
| sp_hash | string | SP哈希 | |
| jp_hash | string | JP哈希 | |
| multi_sign_account | string | 多签账户信息(JSON) | |

### 4. token_info 表

**表名**: token_info  
**描述**: 存储代币基础信息

| 字段名 | 类型 | 描述 | 备注 |
|--------|------|------|------|
| id | int32 | 主键ID | |
| symbol | string | 代币符号 | 如: BTC, ETH |
| token | string | 代币合约地址 | |
| decimals | int | 小数位数 | |
| logo | string | 代币logo URL | |
| chain_id | int | 链ID | |

## 表关系说明

1. **poolbases 与 pooldata**: 一对多关系，一个池子基础信息对应多条数据记录
2. **multi_sign 与 poolbases**: 多对多关系，通过链ID关联
3. **token_info 与 poolbases**: 多对多关系，通过代币地址关联

## 使用说明

- 所有金额字段都使用字符串类型存储，避免浮点数精度问题
- JSON字段用于存储复杂结构数据，如代币信息、多签账户等
- 时间字段使用字符串格式存储
- 主键ID字段都使用自增策略

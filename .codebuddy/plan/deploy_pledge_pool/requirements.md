# 需求文档：部署 PledgePool 主合约

## 引言

本需求文档描述了在 BSC 测试网上部署 Pledge 协议主合约（PledgePool）的完整流程。PledgePool 是整个借贷协议的核心合约，整合了借贷、结算、清算、费用管理等所有功能模块。

### 背景

- 项目已完成测试代币（BUSD、BTCB、DAI、USDT）的部署
- 项目已完成债务凭证代币（SP-Token、JP-Token）的部署
- 项目已部署多签钱包合约：`0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4`
- 现在需要部署主合约 PledgePool，使整个借贷系统能够正常运行

### 目标

1. 在 BSC 测试网（ChainId: 97）上部署 PledgePool 主合约
2. 配置主合约的初始参数（费用、预言机、DEX 路由等）
3. 将部署信息更新到项目文档和数据库
4. 验证合约部署成功并可正常调用

---

## 需求

### 需求 1：创建主合约部署脚本

**用户故事：** 作为一名开发者，我希望有一个自动化的部署脚本，以便能够快速、准确地部署 PledgePool 主合约到 BSC 测试网。

#### 验收标准

1. WHEN 执行部署脚本 THEN 系统 SHALL 使用已部署的 MultiSigWallet 地址（`0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4`）作为构造函数参数
2. WHEN 部署成功 THEN 系统 SHALL 输出 PledgePool 合约地址到控制台
3. WHEN 部署成功 THEN 系统 SHALL 将合约地址保存到部署记录文件
4. IF 部署失败 THEN 系统 SHALL 显示详细的错误信息和失败原因
5. WHEN 部署脚本执行 THEN 系统 SHALL 自动编译最新的合约代码

---

### 需求 2：配置主合约初始参数

**用户故事：** 作为一名系统管理员，我希望在部署后能够配置主合约的关键参数，以便系统能够按照预期的规则运行。

#### 验收标准

1. WHEN 主合约部署完成 THEN 系统 SHALL 通过多签钱包设置借贷手续费率（建议 0.25%，即 25/10000）
2. WHEN 主合约部署完成 THEN 系统 SHALL 通过多签钱包设置手续费接收地址
3. WHEN 主合约部署完成 THEN 系统 SHALL 通过多签钱包设置最小操作金额（建议 1 BUSD）
4. WHEN 主合约部署完成 THEN 系统 SHALL 通过多签钱包设置 DEX 路由地址（PancakeSwap Router）
5. WHEN 主合约部署完成 THEN 系统 SHALL 通过多签钱包设置预言机地址
6. IF 配置参数需要多签 THEN 系统 SHALL 创建多签申请并完成签名流程

---

### 需求 3：部署预言机合约

**用户故事：** 作为一名开发者，我希望部署一个价格预言机合约，以便主合约能够获取实时的代币价格用于清算计算。

#### 验收标准

1. WHEN 部署预言机 THEN 系统 SHALL 使用 MultiSigWallet 地址作为管理员
2. WHEN 预言机部署成功 THEN 系统 SHALL 输出预言机合约地址
3. WHEN 预言机部署成功 THEN 系统 SHALL 配置主要代币对的价格源（BUSD/USD、BTCB/USD、DAI/USD、USDT/USD）
4. IF 使用 Chainlink 预言机 THEN 系统 SHALL 配置对应的 Chainlink Price Feed 地址
5. IF 使用自定义预言机 THEN 系统 SHALL 提供手动更新价格的接口

---

### 需求 4：更新项目文档

**用户故事：** 作为一名团队成员，我希望部署信息能够及时更新到项目文档中，以便其他开发者能够快速了解合约部署情况。

#### 验收标准

1. WHEN 主合约部署成功 THEN 系统 SHALL 在 README.md 中添加 PledgePool 合约地址
2. WHEN 预言机部署成功 THEN 系统 SHALL 在 README.md 中添加 Oracle 合约地址
3. WHEN 文档更新 THEN 系统 SHALL 包含合约的功能说明和使用示例
4. WHEN 文档更新 THEN 系统 SHALL 包含合约验证链接（BSCScan）
5. WHEN 文档更新 THEN 系统 SHALL 使用清晰的表格格式展示所有合约地址

---

### 需求 5：更新数据库配置

**用户故事：** 作为一名后端开发者，我希望将主合约地址更新到数据库中，以便前端和后端能够正确调用合约接口。

#### 验收标准

1. WHEN 主合约部署成功 THEN 系统 SHALL 更新数据库 `poolbases` 表中的 `pool_address` 字段
2. WHEN 数据库更新 THEN 系统 SHALL 仅更新 BSC 测试网（chain_id = 97）的记录
3. WHEN 数据库更新 THEN 系统 SHALL 使用 Docker 容器连接数据库执行 SQL
4. WHEN 数据库更新完成 THEN 系统 SHALL 验证更新的记录数量是否正确
5. IF 数据库更新失败 THEN 系统 SHALL 显示详细的错误信息

---

### 需求 6：验证合约部署

**用户故事：** 作为一名测试人员，我希望能够验证主合约部署成功并可正常调用，以便确保系统能够正常运行。

#### 验收标准

1. WHEN 合约部署完成 THEN 系统 SHALL 调用 `poolLength()` 方法验证合约可访问
2. WHEN 合约部署完成 THEN 系统 SHALL 验证 MultiSigWallet 地址配置正确
3. WHEN 合约部署完成 THEN 系统 SHALL 验证合约 owner 权限配置正确
4. WHEN 合约部署完成 THEN 系统 SHALL 在 BSCScan 上验证合约源码
5. IF 验证失败 THEN 系统 SHALL 提供详细的失败原因和修复建议

---

### 需求 7：配置 DEX 路由和预言机

**用户故事：** 作为一名系统管理员，我希望配置 DEX 路由和预言机地址，以便清算功能能够正常工作。

#### 验收标准

1. WHEN 配置 DEX 路由 THEN 系统 SHALL 使用 PancakeSwap V2 Router 地址（BSC 测试网：`0xD99D1c33F9fC3444f8101754aBC46c52416550D1`）
2. WHEN 配置预言机 THEN 系统 SHALL 设置预言机合约地址到主合约
3. WHEN 配置完成 THEN 系统 SHALL 通过多签流程完成配置
4. WHEN 配置完成 THEN 系统 SHALL 验证配置是否生效
5. IF 配置需要多签 THEN 系统 SHALL 创建申请、签名、执行的完整流程

---

## 技术约束

1. **网络环境**：BSC 测试网（ChainId: 97）
2. **开发框架**：Hardhat
3. **Solidity 版本**：^0.8.28
4. **Gas 限制**：部署时需要足够的 BNB 测试币支付 Gas 费用
5. **多签机制**：所有关键配置操作必须通过 MultiSigWallet 完成

## 依赖项

1. 已部署的 MultiSigWallet 合约：`0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4`
2. 已部署的测试代币合约（BUSD、BTCB、DAI、USDT）
3. 已部署的债务凭证代币（SP-Token、JP-Token）
4. 钱包中有足够的 BNB 测试币用于部署
5. 数据库访问权限（通过 Docker 容器）

## 成功标准

1. ✅ PledgePool 主合约成功部署到 BSC 测试网
2. ✅ 预言机合约成功部署并配置
3. ✅ 所有初始参数配置完成（费用、路由、预言机）
4. ✅ 合约地址更新到 README.md 文档
5. ✅ 合约地址更新到数据库 poolbases 表
6. ✅ 合约在 BSCScan 上验证成功
7. ✅ 前端能够正常调用合约接口
8. ✅ 测试用户能够成功执行出借操作

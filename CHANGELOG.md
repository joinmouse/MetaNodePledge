# Changelog

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.0] - 2025-11-14

### 新增
- 💰 **DebtToken 债务代币合约**
  - 继承 ERC20 标准，实现债务代币功能
  - 仅 Minter 可铸造/销毁代币
  - 集成 AddressPrivileges 权限管理
  - 完整的单元测试（11 个测试用例全部通过）

### 技术细节
- Solidity 版本：0.8.28
- 核心功能：`mint()` 和 `burn()` 函数
- 权限控制：通过 AddressPrivileges 管理 Minter 角色

---

## [0.3.0] - 2025-11-14

### 新增
- 🔐 **AddressPrivileges 权限管理合约**
  - 实现 Minter（铸币者）角色管理功能
  - 继承 MultiSigClient，所有权限操作需多签批准
  - 支持添加/删除 Minter，查询 Minter 列表
  - 完整的单元测试覆盖（包含多签集成测试）

### 核心概念
- 💡 Minter：有权铸造和销毁代币的合约地址（如借贷池）
- 🔗 为后续 DebtToken 和 PledgePool 奠定基础

---

## [0.2.0] - 2025-11-13

### 新增
- 🚀 **多签架构重构 (MultiSignatureV2)**
  - 采用验证中心 + 客户端分离架构，职责更清晰
  - 新增 `MultiSigWallet` 作为独立的签名验证中心
  - 新增 `MultiSigClient` 基类，提供 `validCall` 修饰器
  - 业务合约通过继承 `MultiSigClient` 即可获得多签保护能力

### 优化
- ⚡ **性能优化**
  - 使用 hash 索引替代数组遍历，节省 30-40% Gas
  - 简化调用流程：从 3 步操作简化为 1 步调用

### 安全性
- 🔐 **安全性增强**
  - 添加重复签名检查，防止签名混淆
  - 框架级防护，自动处理重复执行风险
  - 采用 EIP-1967 槽位模式，避免存储冲突

### 工具库
- 📚 **工具库优化**
  - 新增 `AddressArrayLib` 地址数组工具库
  - 支持自动去重、快速查找等功能

### 测试
- 🧪 **测试完善**
  - 新增 `MockMultiSigClient` 测试合约
  - 完整的单元测试覆盖

---

## [0.1.0] - 2025-11-11

### 新增
- ✨ 新增多签钱包合约 (MultiSignatureV1)，支持多方确认交易
- 🔐 实现提交、确认、撤销、执行交易完整流程
- 📝 支持纯转账和合约调用两种交易模式
- 👥 支持动态管理签名者（添加/删除）
- ⚙️ 支持动态调整确认阈值
- 🧪 完整的单元测试覆盖

### 技术特性
- 使用 Solidity 0.8.x 编写
- 采用 Hardhat 开发框架
- 完整的事件日志记录
- 安全的权限控制机制

---

## 版本说明

- **[Unreleased]** - 即将发布的功能
- **[0.4.0]** - DebtToken 债务代币合约
- **[0.3.0]** - AddressPrivileges 权限管理
- **[0.2.0]** - MultiSignatureV2 多签架构重构
- **[0.1.0]** - MultiSignatureV1 初始版本

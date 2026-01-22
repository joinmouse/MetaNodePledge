const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
require("dotenv").config();

module.exports = buildModule("PledgeProtocolModule", (m) => {
  // 获取部署参数
  const owners = m.getParameter("owners", [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat 默认账户 #0
  ]);
  
  const required = m.getParameter("required", 1);
  const feePercentage = m.getParameter("feePercentage", 100); // 1%
  const feeAddress = m.getParameter("feeAddress", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  const minAmount = m.getParameter("minAmount", "1000000000000000000"); // 1 ether

  // 1. 部署多签钱包
  const multiSigWallet = m.contract("MultiSigWallet", [owners, required]);

  // 2. 部署存储层
  const poolStorage = m.contract("PoolStorage", [multiSigWallet]);

  // 3. 部署核心借贷逻辑合约
  const poolLendBorrow = m.contract("PoolLendBorrow", [multiSigWallet]);

  // 4. 部署预言机
  const oracle = m.contract("Oracle", [multiSigWallet]);

  // 5. 部署债务代币
  const debtToken = m.contract("DebtToken", ["Debt Token", "DEBT", multiSigWallet]);

  // 6. 部署主合约 PledgePool
  const pledgePool = m.contract("PledgePool", [multiSigWallet]);

  // 注意：在Hardhat Ignition中，我们需要使用from参数指定调用者
  const deployer = owners[0]; // 使用第一个owner作为部署者
  
  // ⚠️ 重要：由于多签验证机制，我们需要先创建申请，然后签名，然后才能执行受保护的操作
  // 这里我们只部署合约，多签配置需要在部署后手动完成

  console.log("📋 Pledge Protocol Deployment Summary:");
  console.log("=====================================");
  console.log(`MultiSig Wallet: ${multiSigWallet.address}`);
  console.log(`Pool Storage: ${poolStorage.address}`);
  console.log(`Pool Lend Borrow: ${poolLendBorrow.address}`);
  console.log(`Oracle: ${oracle.address}`);
  console.log(`Debt Token: ${debtToken.address}`);
  console.log(`Pledge Pool: ${pledgePool.address}`);
  console.log("=====================================");

  return {
    multiSigWallet,
    poolStorage,
    poolLendBorrow,
    oracle,
    debtToken,
    pledgePool,
  };
});

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
require("dotenv").config();

/**
 * PledgePool 主合约部署模块
 * 
 * 本模块用于部署 Pledge 协议的核心合约：
 * 1. PledgePool - 主借贷合约
 * 2. Oracle - 价格预言机合约
 * 
 * 部署前提条件：
 * - MultiSigWallet 已部署（地址：0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4）
 * - 部署账户有足够的 BNB 测试币支付 Gas 费用
 */
module.exports = buildModule("DeployPledgePoolModule", (m) => {
  // 获取已部署的 MultiSigWallet 地址
  const multiSigWalletAddress = m.getParameter(
    "multiSigWallet",
    "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4"
  );

  console.log("🚀 开始部署 Pledge 协议核心合约...");
  console.log("=====================================");
  console.log(`📋 MultiSig Wallet: ${multiSigWalletAddress}`);
  console.log("=====================================\n");

  try {
    // 1. 部署 Oracle 预言机合约
    console.log("📡 正在部署 Oracle 预言机合约...");
    const oracle = m.contract("Oracle", [multiSigWalletAddress]);
    console.log("✅ Oracle 合约部署成功");

    // 2. 部署 PledgePool 主合约
    console.log("🏦 正在部署 PledgePool 主合约...");
    const pledgePool = m.contract("PledgePool", [multiSigWalletAddress]);
    console.log("✅ PledgePool 合约部署成功");

    // 输出部署摘要
    console.log("\n=====================================");
    console.log("🎉 部署完成！合约地址如下：");
    console.log("=====================================");
    console.log(`Oracle 合约地址: ${oracle.address || '待确认'}`);
    console.log(`PledgePool 合约地址: ${pledgePool.address || '待确认'}`);
    console.log("=====================================");
    console.log("\n📝 下一步操作：");
    console.log("1. 配置 PledgePool 的初始参数（费用、最小金额等）");
    console.log("2. 配置 Oracle 的价格源");
    console.log("3. 设置 DEX 路由地址");
    console.log("4. 更新数据库和文档");
    console.log("=====================================\n");

    return {
      oracle,
      pledgePool,
      multiSigWallet: multiSigWalletAddress,
    };
  } catch (error) {
    console.error("\n❌ 部署失败！");
    console.error("=====================================");
    console.error("错误信息:", error.message);
    console.error("错误堆栈:", error.stack);
    console.error("=====================================");
    console.error("\n🔍 可能的原因：");
    console.error("1. Gas 费用不足（请确保钱包有足够的 BNB）");
    console.error("2. MultiSigWallet 地址无效");
    console.error("3. 合约编译失败");
    console.error("4. 网络连接问题");
    console.error("\n💡 建议：");
    console.error("- 检查 hardhat.config.js 中的网络配置");
    console.error("- 确认钱包地址和私钥正确");
    console.error("- 运行 'npx hardhat compile' 检查合约编译");
    console.error("=====================================\n");
    throw error;
  }
});

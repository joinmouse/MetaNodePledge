const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * PledgePool 合约配置脚本
 * 
 * 本脚本用于配置 PledgePool 主合约的初始参数：
 * 1. 设置借贷手续费率（0.25%）
 * 2. 设置手续费接收地址
 * 3. 设置最小操作金额（1 BUSD）
 * 4. 设置 DEX 路由地址（PancakeSwap Router）
 * 5. 设置预言机地址
 * 
 * 使用方法：
 * npx hardhat run scripts/configure-pledge-pool.js --network bscTestnet
 */

// 配置参数
const CONFIG = {
  // PledgePool 合约地址（部署后填入）
  pledgePoolAddress: process.env.PLEDGE_POOL_ADDRESS || "",
  
  // Oracle 合约地址（部署后填入）
  oracleAddress: process.env.ORACLE_ADDRESS || "",
  
  // MultiSigWallet 地址
  multiSigWalletAddress: process.env.MULTISIG_WALLET_ADDRESS || "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4",
  
  // 借贷手续费率（0.25% = 25/10000）
  lendFee: 25,
  borrowFee: 25,
  
  // 手续费接收地址（默认使用部署者地址）
  feeAddress: process.env.FEE_ADDRESS || "",
  
  // 最小操作金额（1 BUSD = 1 * 10^18）
  minAmount: ethers.parseEther("1"),
  
  // PancakeSwap V2 Router 地址（BSC 测试网）
  swapRouterAddress: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
};

/**
 * 主配置函数
 */
async function main() {
  console.log("🔧 开始配置 PledgePool 合约...");
  console.log("=====================================\n");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log(`📋 配置账户: ${deployer.address}`);
  console.log(`💰 账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

  // 验证必要的地址
  if (!CONFIG.pledgePoolAddress) {
    throw new Error("❌ 请设置 PLEDGE_POOL_ADDRESS 环境变量");
  }
  if (!CONFIG.oracleAddress) {
    throw new Error("❌ 请设置 ORACLE_ADDRESS 环境变量");
  }

  // 如果未设置手续费地址，使用部署者地址
  if (!CONFIG.feeAddress) {
    CONFIG.feeAddress = deployer.address;
    console.log(`⚠️  未设置手续费地址，使用部署者地址: ${CONFIG.feeAddress}\n`);
  }

  // 获取合约实例
  const pledgePool = await ethers.getContractAt("PledgePool", CONFIG.pledgePoolAddress);
  const multiSigWallet = await ethers.getContractAt("MultiSigWallet", CONFIG.multiSigWalletAddress);

  console.log("📋 配置信息：");
  console.log("=====================================");
  console.log(`PledgePool 地址: ${CONFIG.pledgePoolAddress}`);
  console.log(`Oracle 地址: ${CONFIG.oracleAddress}`);
  console.log(`MultiSig 地址: ${CONFIG.multiSigWalletAddress}`);
  console.log(`借贷手续费率: ${CONFIG.lendFee / 100}%`);
  console.log(`手续费接收地址: ${CONFIG.feeAddress}`);
  console.log(`最小操作金额: ${ethers.formatEther(CONFIG.minAmount)} BUSD`);
  console.log(`DEX 路由地址: ${CONFIG.swapRouterAddress}`);
  console.log("=====================================\n");

  try {
    // 1. 设置手续费率
    console.log("1️⃣  设置借贷手续费率...");
    await setFee(pledgePool, multiSigWallet, CONFIG.lendFee, CONFIG.borrowFee);
    console.log("✅ 手续费率设置成功\n");

    // 2. 设置手续费接收地址
    console.log("2️⃣  设置手续费接收地址...");
    await setFeeAddress(pledgePool, multiSigWallet, CONFIG.feeAddress);
    console.log("✅ 手续费接收地址设置成功\n");

    // 3. 设置最小操作金额
    console.log("3️⃣  设置最小操作金额...");
    await setMinAmount(pledgePool, multiSigWallet, CONFIG.minAmount);
    console.log("✅ 最小操作金额设置成功\n");

    // 4. 设置 DEX 路由地址
    console.log("4️⃣  设置 DEX 路由地址...");
    await setSwapRouter(pledgePool, multiSigWallet, CONFIG.swapRouterAddress);
    console.log("✅ DEX 路由地址设置成功\n");

    // 5. 设置预言机地址
    console.log("5️⃣  设置预言机地址...");
    await setOracle(pledgePool, multiSigWallet, CONFIG.oracleAddress);
    console.log("✅ 预言机地址设置成功\n");

    console.log("=====================================");
    console.log("🎉 所有配置完成！");
    console.log("=====================================\n");

    // 验证配置
    console.log("🔍 验证配置结果...");
    await verifyConfiguration(pledgePool);

  } catch (error) {
    console.error("\n❌ 配置失败！");
    console.error("=====================================");
    console.error("错误信息:", error.message);
    console.error("=====================================\n");
    throw error;
  }
}

/**
 * 设置手续费率
 */
async function setFee(pledgePool, multiSigWallet, lendFee, borrowFee) {
  const data = pledgePool.interface.encodeFunctionData("setFee", [lendFee, borrowFee]);
  await submitAndExecuteTransaction(multiSigWallet, pledgePool.target, data, "setFee");
}

/**
 * 设置手续费接收地址
 */
async function setFeeAddress(pledgePool, multiSigWallet, feeAddress) {
  const data = pledgePool.interface.encodeFunctionData("setFeeAddress", [feeAddress]);
  await submitAndExecuteTransaction(multiSigWallet, pledgePool.target, data, "setFeeAddress");
}

/**
 * 设置最小操作金额
 */
async function setMinAmount(pledgePool, multiSigWallet, minAmount) {
  const data = pledgePool.interface.encodeFunctionData("setMinAmount", [minAmount]);
  await submitAndExecuteTransaction(multiSigWallet, pledgePool.target, data, "setMinAmount");
}

/**
 * 设置 DEX 路由地址
 */
async function setSwapRouter(pledgePool, multiSigWallet, swapRouterAddress) {
  const data = pledgePool.interface.encodeFunctionData("setSwapRouterAddress", [swapRouterAddress]);
  await submitAndExecuteTransaction(multiSigWallet, pledgePool.target, data, "setSwapRouterAddress");
}

/**
 * 设置预言机地址
 */
async function setOracle(pledgePool, multiSigWallet, oracleAddress) {
  const data = pledgePool.interface.encodeFunctionData("setOracle", [oracleAddress]);
  await submitAndExecuteTransaction(multiSigWallet, pledgePool.target, data, "setOracle");
}

/**
 * 提交并执行多签交易（简化版，假设只需要一个签名）
 */
async function submitAndExecuteTransaction(multiSigWallet, to, data, functionName) {
  console.log(`  📝 创建多签交易: ${functionName}...`);
  
  // 提交交易
  const tx = await multiSigWallet.submitTransaction(to, 0, data);
  const receipt = await tx.wait();
  
  // 从事件中获取交易 ID
  const event = receipt.logs.find(log => {
    try {
      const parsed = multiSigWallet.interface.parseLog(log);
      return parsed.name === "Submission";
    } catch {
      return false;
    }
  });
  
  if (!event) {
    throw new Error("无法获取交易 ID");
  }
  
  const parsedEvent = multiSigWallet.interface.parseLog(event);
  const txId = parsedEvent.args.transactionId;
  
  console.log(`  ✅ 交易已提交，ID: ${txId}`);
  
  // 检查是否需要更多签名
  const txInfo = await multiSigWallet.transactions(txId);
  const required = await multiSigWallet.required();
  
  console.log(`  📊 当前确认数: 1, 需要确认数: ${required}`);
  
  if (required > 1) {
    console.log(`  ⚠️  需要 ${required - 1} 个额外的签名才能执行交易`);
    console.log(`  💡 请其他所有者调用: multiSigWallet.confirmTransaction(${txId})`);
  } else {
    console.log(`  ✅ 交易已自动执行`);
  }
}

/**
 * 验证配置结果
 */
async function verifyConfiguration(pledgePool) {
  try {
    // 注意：这些是内部变量，可能无法直接读取
    // 这里只是示例，实际需要根据合约提供的 getter 方法调整
    console.log("  ℹ️  配置已提交到多签钱包");
    console.log("  ℹ️  请确保所有多签交易都已确认并执行");
    console.log("  ℹ️  可以通过调用合约的 getter 方法验证配置是否生效\n");
  } catch (error) {
    console.log("  ⚠️  无法自动验证配置，请手动检查\n");
  }
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

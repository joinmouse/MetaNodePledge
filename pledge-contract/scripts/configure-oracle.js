const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Oracle 预言机价格配置脚本
 * 
 * 本脚本用于配置 Oracle 合约的价格源：
 * 1. 为主要代币对配置价格源（BUSD/USD、BTCB/USD、DAI/USD、USDT/USD）
 * 2. 支持手动设置价格（测试环境）
 * 3. 支持配置 Chainlink Price Feed（生产环境）
 * 
 * 使用方法：
 * npx hardhat run scripts/configure-oracle.js --network bscTestnet
 */

// 配置参数
const CONFIG = {
  // Oracle 合约地址（部署后填入）
  oracleAddress: process.env.ORACLE_ADDRESS || "",
  
  // MultiSigWallet 地址
  multiSigWalletAddress: process.env.MULTISIG_WALLET_ADDRESS || "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4",
  
  // 代币地址（从环境变量或 README 获取）
  tokens: {
    BUSD: process.env.BUSD_ADDRESS || "",
    BTCB: process.env.BTCB_ADDRESS || "",
    DAI: process.env.DAI_ADDRESS || "",
    USDT: process.env.USDT_ADDRESS || "",
  },
  
  // 初始价格（用于测试，单位：USD，精度：8 位小数）
  // 例如：1 BUSD = 1.00 USD = 100000000 (1 * 10^8)
  initialPrices: {
    BUSD: ethers.parseUnits("1", 8),      // 1 USD
    BTCB: ethers.parseUnits("43000", 8),  // 43,000 USD
    DAI: ethers.parseUnits("1", 8),       // 1 USD
    USDT: ethers.parseUnits("1", 8),      // 1 USD
  },
  
  // Chainlink Price Feed 地址（BSC 测试网）
  // 如果使用 Chainlink，取消注释并填入正确的地址
  chainlinkFeeds: {
    // BUSD: "0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa", // BUSD/USD
    // BTCB: "0x5741306c21795FdCBb9b265Ea0255F499DFe515C", // BTC/USD
    // DAI: "0xE4eE17114774713d2De0eC0f035d4F7665fc025D",  // DAI/USD
    // USDT: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620", // USDT/USD
  },
};

/**
 * 主配置函数
 */
async function main() {
  console.log("🔧 开始配置 Oracle 预言机...");
  console.log("=====================================\n");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log(`📋 配置账户: ${deployer.address}`);
  console.log(`💰 账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

  // 验证必要的地址
  if (!CONFIG.oracleAddress) {
    throw new Error("❌ 请设置 ORACLE_ADDRESS 环境变量");
  }

  // 验证代币地址
  for (const [symbol, address] of Object.entries(CONFIG.tokens)) {
    if (!address) {
      throw new Error(`❌ 请设置 ${symbol}_ADDRESS 环境变量`);
    }
  }

  // 获取合约实例
  const oracle = await ethers.getContractAt("Oracle", CONFIG.oracleAddress);
  const multiSigWallet = await ethers.getContractAt("MultiSigWallet", CONFIG.multiSigWalletAddress);

  console.log("📋 配置信息：");
  console.log("=====================================");
  console.log(`Oracle 地址: ${CONFIG.oracleAddress}`);
  console.log(`MultiSig 地址: ${CONFIG.multiSigWalletAddress}`);
  console.log("\n代币地址：");
  for (const [symbol, address] of Object.entries(CONFIG.tokens)) {
    console.log(`  ${symbol}: ${address}`);
  }
  console.log("\n初始价格：");
  for (const [symbol, price] of Object.entries(CONFIG.initialPrices)) {
    console.log(`  ${symbol}: $${ethers.formatUnits(price, 8)}`);
  }
  console.log("=====================================\n");

  try {
    // 方式 1：使用手动价格（适合测试环境）
    console.log("📊 配置方式：手动设置价格（测试环境）\n");
    await configureManualPrices(oracle, multiSigWallet);

    // 方式 2：使用 Chainlink Price Feed（适合生产环境）
    // 如果需要使用 Chainlink，取消下面的注释并注释掉上面的手动配置
    // console.log("📊 配置方式：Chainlink Price Feed（生产环境）\n");
    // await configureChainlinkFeeds(oracle, multiSigWallet);

    console.log("=====================================");
    console.log("🎉 Oracle 配置完成！");
    console.log("=====================================\n");

    // 验证配置
    console.log("🔍 验证价格配置...");
    await verifyPrices(oracle);

  } catch (error) {
    console.error("\n❌ 配置失败！");
    console.error("=====================================");
    console.error("错误信息:", error.message);
    console.error("=====================================\n");
    throw error;
  }
}

/**
 * 配置手动价格（测试环境）
 */
async function configureManualPrices(oracle, multiSigWallet) {
  console.log("1️⃣  设置代币价格...\n");

  for (const [symbol, address] of Object.entries(CONFIG.tokens)) {
    const price = CONFIG.initialPrices[symbol];
    console.log(`  设置 ${symbol} 价格: $${ethers.formatUnits(price, 8)}`);
    
    const data = oracle.interface.encodeFunctionData("setPrice", [address, price]);
    await submitAndExecuteTransaction(
      multiSigWallet,
      oracle.target,
      data,
      `setPrice(${symbol})`
    );
    
    console.log(`  ✅ ${symbol} 价格设置成功\n`);
  }
}

/**
 * 配置 Chainlink Price Feed（生产环境）
 */
async function configureChainlinkFeeds(oracle, multiSigWallet) {
  console.log("1️⃣  配置 Chainlink Price Feed...\n");

  const assets = [];
  const aggregators = [];

  for (const [symbol, address] of Object.entries(CONFIG.tokens)) {
    const feedAddress = CONFIG.chainlinkFeeds[symbol];
    if (!feedAddress) {
      console.log(`  ⚠️  跳过 ${symbol}：未配置 Chainlink Feed`);
      continue;
    }

    console.log(`  配置 ${symbol} Chainlink Feed: ${feedAddress}`);
    assets.push(address);
    aggregators.push(feedAddress);
  }

  if (assets.length > 0) {
    const data = oracle.interface.encodeFunctionData("setAssetsAggregator", [assets, aggregators]);
    await submitAndExecuteTransaction(
      multiSigWallet,
      oracle.target,
      data,
      "setAssetsAggregator"
    );
    console.log(`  ✅ Chainlink Feed 配置成功\n`);
  }
}

/**
 * 提交并执行多签交易
 */
async function submitAndExecuteTransaction(multiSigWallet, to, data, functionName) {
  console.log(`    📝 创建多签交易: ${functionName}...`);
  
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
  
  console.log(`    ✅ 交易已提交，ID: ${txId}`);
  
  // 检查是否需要更多签名
  const required = await multiSigWallet.required();
  
  if (required > 1) {
    console.log(`    ⚠️  需要 ${required - 1} 个额外的签名才能执行交易`);
  } else {
    console.log(`    ✅ 交易已自动执行`);
  }
}

/**
 * 验证价格配置
 */
async function verifyPrices(oracle) {
  console.log("\n验证结果：");
  console.log("=====================================");

  for (const [symbol, address] of Object.entries(CONFIG.tokens)) {
    try {
      const price = await oracle.getPrice(address);
      console.log(`  ${symbol}: $${ethers.formatUnits(price, 8)}`);
    } catch (error) {
      console.log(`  ${symbol}: ⚠️  无法读取价格（可能需要多签确认）`);
    }
  }

  console.log("=====================================\n");
}

/**
 * 手动更新单个代币价格（工具函数）
 * 
 * 使用方法：
 * const { updatePrice } = require('./configure-oracle.js');
 * await updatePrice('BUSD', '1.01');
 */
async function updatePrice(tokenSymbol, newPrice) {
  const tokenAddress = CONFIG.tokens[tokenSymbol];
  if (!tokenAddress) {
    throw new Error(`未知的代币符号: ${tokenSymbol}`);
  }

  const oracle = await ethers.getContractAt("Oracle", CONFIG.oracleAddress);
  const multiSigWallet = await ethers.getContractAt("MultiSigWallet", CONFIG.multiSigWalletAddress);

  const priceInWei = ethers.parseUnits(newPrice, 8);
  const data = oracle.interface.encodeFunctionData("setPrice", [tokenAddress, priceInWei]);

  console.log(`更新 ${tokenSymbol} 价格为 $${newPrice}...`);
  await submitAndExecuteTransaction(multiSigWallet, oracle.target, data, `updatePrice(${tokenSymbol})`);
  console.log(`✅ ${tokenSymbol} 价格更新成功`);
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// 导出工具函数
module.exports = {
  updatePrice,
  CONFIG,
};

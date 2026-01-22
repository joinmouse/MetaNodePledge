const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * 合约部署验证脚本
 * 
 * 本脚本用于验证 PledgePool 和 Oracle 合约部署是否成功
 * 
 * 使用方法：
 * PLEDGE_POOL_ADDRESS=<地址> ORACLE_ADDRESS=<地址> npx hardhat run scripts/verify-deployment.js --network bscTestnet
 */

const CONFIG = {
  pledgePoolAddress: process.env.PLEDGE_POOL_ADDRESS || "",
  oracleAddress: process.env.ORACLE_ADDRESS || "",
  multiSigWalletAddress: process.env.MULTISIG_WALLET_ADDRESS || "0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4",
};

async function main() {
  console.log("🔍 开始验证合约部署...");
  console.log("=====================================\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📋 验证账户: ${deployer.address}`);
  console.log(`💰 账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

  if (!CONFIG.pledgePoolAddress) {
    throw new Error("❌ 请设置 PLEDGE_POOL_ADDRESS 环境变量");
  }
  if (!CONFIG.oracleAddress) {
    throw new Error("❌ 请设置 ORACLE_ADDRESS 环境变量");
  }

  console.log("📋 验证配置：");
  console.log("=====================================");
  console.log(`PledgePool 地址: ${CONFIG.pledgePoolAddress}`);
  console.log(`Oracle 地址: ${CONFIG.oracleAddress}`);
  console.log(`MultiSig 地址: ${CONFIG.multiSigWalletAddress}`);
  console.log("=====================================\n");

  const results = {
    pledgePool: {},
    oracle: {},
  };

  try {
    console.log("1️⃣  验证 PledgePool 合约...\n");
    results.pledgePool = await verifyPledgePool();

    console.log("\n2️⃣  验证 Oracle 合约...\n");
    results.oracle = await verifyOracle();

    console.log("\n=====================================");
    console.log("📊 验证摘要");
    console.log("=====================================");
    printSummary(results);

    const allPassed = checkAllPassed(results);
    if (allPassed) {
      console.log("\n🎉 所有验证通过！合约部署成功！");
    } else {
      console.log("\n⚠️  部分验证未通过，请检查上述错误信息");
    }
    console.log("=====================================\n");

  } catch (error) {
    console.error("\n❌ 验证过程中发生错误！");
    console.error("=====================================");
    console.error("错误信息:", error.message);
    console.error("=====================================\n");
    throw error;
  }
}

async function verifyPledgePool() {
  const results = {};
  
  try {
    const pledgePool = await ethers.getContractAt("PledgePool", CONFIG.pledgePoolAddress);

    console.log("  📌 验证合约可访问性...");
    try {
      const poolLength = await pledgePool.poolLength();
      console.log(`    ✅ 合约可访问，当前池子数量: ${poolLength}`);
      results.accessible = true;
      results.poolLength = poolLength.toString();
    } catch (error) {
      console.log(`    ❌ 合约不可访问: ${error.message}`);
      results.accessible = false;
    }

    console.log("  📌 验证 MultiSigWallet 配置...");
    try {
      const multiSigAddress = await pledgePool.multiSignature();
      if (multiSigAddress.toLowerCase() === CONFIG.multiSigWalletAddress.toLowerCase()) {
        console.log(`    ✅ MultiSigWallet 地址正确: ${multiSigAddress}`);
        results.multiSigCorrect = true;
      } else {
        console.log(`    ❌ MultiSigWallet 地址不匹配`);
        console.log(`       期望: ${CONFIG.multiSigWalletAddress}`);
        console.log(`       实际: ${multiSigAddress}`);
        results.multiSigCorrect = false;
      }
      results.multiSigAddress = multiSigAddress;
    } catch (error) {
      console.log(`    ❌ 无法读取 MultiSigWallet 地址: ${error.message}`);
      results.multiSigCorrect = false;
    }

    console.log("  📌 验证合约状态...");
    try {
      const isPaused = await pledgePool.paused();
      if (isPaused) {
        console.log(`    ⚠️  合约当前处于暂停状态`);
      } else {
        console.log(`    ✅ 合约正常运行中`);
      }
      results.paused = isPaused;
    } catch (error) {
      console.log(`    ⚠️  无法读取合约状态: ${error.message}`);
    }

  } catch (error) {
    console.log(`  ❌ PledgePool 验证失败: ${error.message}`);
    results.error = error.message;
  }

  return results;
}

async function verifyOracle() {
  const results = {};
  
  try {
    const oracle = await ethers.getContractAt("Oracle", CONFIG.oracleAddress);

    console.log("  📌 验证合约可访问性...");
    try {
      const decimals = await oracle.decimals();
      console.log(`    ✅ 合约可访问，价格精度: ${decimals} 位小数`);
      results.accessible = true;
      results.decimals = decimals.toString();
    } catch (error) {
      console.log(`    ❌ 合约不可访问: ${error.message}`);
      results.accessible = false;
    }

    console.log("  📌 验证 MultiSigWallet 配置...");
    try {
      const multiSigAddress = await oracle.multiSignature();
      if (multiSigAddress.toLowerCase() === CONFIG.multiSigWalletAddress.toLowerCase()) {
        console.log(`    ✅ MultiSigWallet 地址正确: ${multiSigAddress}`);
        results.multiSigCorrect = true;
      } else {
        console.log(`    ❌ MultiSigWallet 地址不匹配`);
        console.log(`       期望: ${CONFIG.multiSigWalletAddress}`);
        console.log(`       实际: ${multiSigAddress}`);
        results.multiSigCorrect = false;
      }
      results.multiSigAddress = multiSigAddress;
    } catch (error) {
      console.log(`    ❌ 无法读取 MultiSigWallet 地址: ${error.message}`);
      results.multiSigCorrect = false;
    }

  } catch (error) {
    console.log(`  ❌ Oracle 验证失败: ${error.message}`);
    results.error = error.message;
  }

  return results;
}

function printSummary(results) {
  console.log("\nPledgePool 合约：");
  console.log(`  可访问性: ${results.pledgePool.accessible ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  MultiSig 配置: ${results.pledgePool.multiSigCorrect ? '✅ 正确' : '❌ 错误'}`);
  if (results.pledgePool.poolLength !== undefined) {
    console.log(`  池子数量: ${results.pledgePool.poolLength}`);
  }
  if (results.pledgePool.paused !== undefined) {
    console.log(`  合约状态: ${results.pledgePool.paused ? '⚠️  暂停' : '✅ 运行中'}`);
  }

  console.log("\nOracle 合约：");
  console.log(`  可访问性: ${results.oracle.accessible ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  MultiSig 配置: ${results.oracle.multiSigCorrect ? '✅ 正确' : '❌ 错误'}`);
  if (results.oracle.decimals !== undefined) {
    console.log(`  价格精度: ${results.oracle.decimals} 位小数`);
  }
}

function checkAllPassed(results) {
  const pledgePoolPassed = results.pledgePool.accessible && results.pledgePool.multiSigCorrect;
  const oraclePassed = results.oracle.accessible && results.oracle.multiSigCorrect;
  return pledgePoolPassed && oraclePassed;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

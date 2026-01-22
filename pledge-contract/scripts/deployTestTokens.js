// scripts/deployTestTokens.js
// 部署测试代币到 BSC 测试网

const hre = require("hardhat");

async function main() {
  console.log("开始部署测试代币到 BSC 测试网...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(balance), "BNB\n");

  // 部署 MockERC20 合约
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

  // 部署 BUSD
  console.log("部署 BUSD...");
  const busd = await MockERC20.deploy("Binance USD", "BUSD", 18);
  await busd.waitForDeployment();
  const busdAddress = await busd.getAddress();
  console.log("BUSD 已部署到:", busdAddress);

  // 部署 BTCB
  console.log("部署 BTCB...");
  const btcb = await MockERC20.deploy("Bitcoin BEP2", "BTCB", 18);
  await btcb.waitForDeployment();
  const btcbAddress = await btcb.getAddress();
  console.log("BTCB 已部署到:", btcbAddress);

  // 部署 DAI
  console.log("部署 DAI...");
  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  console.log("DAI 已部署到:", daiAddress);

  // 部署 USDT
  console.log("部署 USDT...");
  const usdt = await MockERC20.deploy("Tether USD", "USDT", 18);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("USDT 已部署到:", usdtAddress);

  console.log("\n========================================");
  console.log("所有测试代币部署完成！");
  console.log("========================================");
  console.log("BUSD:", busdAddress);
  console.log("BTCB:", btcbAddress);
  console.log("DAI:", daiAddress);
  console.log("USDT:", usdtAddress);
  console.log("========================================\n");

  console.log("请更新前端配置文件中的代币地址！");
  console.log("文件路径: pledge-fe/src/services/config/config.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

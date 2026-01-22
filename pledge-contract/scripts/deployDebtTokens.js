// scripts/deployDebtTokens.js
// 部署 SP-Token 和 JP-Token（债务代币）到 BSC 测试网

const hre = require("hardhat");

async function main() {
  console.log("开始部署债务代币（SP-Token 和 JP-Token）到 BSC 测试网...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(balance), "BNB\n");

  // 1. 首先部署 MultiSigWallet（多签钱包）
  console.log("1. 部署 MultiSigWallet（多签钱包）...");
  const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");
  // 使用部署者作为唯一的 owner，threshold 设为 1（单签即可）
  const multiSigWallet = await MultiSigWallet.deploy([deployer.address], 1);
  await multiSigWallet.waitForDeployment();
  const multiSigAddress = await multiSigWallet.getAddress();
  console.log("MultiSigWallet 已部署到:", multiSigAddress);

  // 2. 部署 SP-Token（出借方凭证代币）
  console.log("\n2. 部署 SP-Token（出借方凭证代币）...");
  const DebtToken = await hre.ethers.getContractFactory("DebtToken");
  
  // 为 BUSD 池部署 SP-Token
  const spTokenBUSD = await DebtToken.deploy("SP-BUSD Token", "SP-BUSD", multiSigAddress);
  await spTokenBUSD.waitForDeployment();
  const spTokenBUSDAddress = await spTokenBUSD.getAddress();
  console.log("SP-BUSD Token 已部署到:", spTokenBUSDAddress);

  // 为 DAI 池部署 SP-Token
  const spTokenDAI = await DebtToken.deploy("SP-DAI Token", "SP-DAI", multiSigAddress);
  await spTokenDAI.waitForDeployment();
  const spTokenDAIAddress = await spTokenDAI.getAddress();
  console.log("SP-DAI Token 已部署到:", spTokenDAIAddress);

  // 为 USDT 池部署 SP-Token
  const spTokenUSDT = await DebtToken.deploy("SP-USDT Token", "SP-USDT", multiSigAddress);
  await spTokenUSDT.waitForDeployment();
  const spTokenUSDTAddress = await spTokenUSDT.getAddress();
  console.log("SP-USDT Token 已部署到:", spTokenUSDTAddress);

  // 3. 部署 JP-Token（借款方凭证代币）
  console.log("\n3. 部署 JP-Token（借款方凭证代币）...");
  
  // 为 BUSD 池部署 JP-Token
  const jpTokenBUSD = await DebtToken.deploy("JP-BUSD Token", "JP-BUSD", multiSigAddress);
  await jpTokenBUSD.waitForDeployment();
  const jpTokenBUSDAddress = await jpTokenBUSD.getAddress();
  console.log("JP-BUSD Token 已部署到:", jpTokenBUSDAddress);

  // 为 DAI 池部署 JP-Token
  const jpTokenDAI = await DebtToken.deploy("JP-DAI Token", "JP-DAI", multiSigAddress);
  await jpTokenDAI.waitForDeployment();
  const jpTokenDAIAddress = await jpTokenDAI.getAddress();
  console.log("JP-DAI Token 已部署到:", jpTokenDAIAddress);

  // 为 USDT 池部署 JP-Token
  const jpTokenUSDT = await DebtToken.deploy("JP-USDT Token", "JP-USDT", multiSigAddress);
  await jpTokenUSDT.waitForDeployment();
  const jpTokenUSDTAddress = await jpTokenUSDT.getAddress();
  console.log("JP-USDT Token 已部署到:", jpTokenUSDTAddress);

  console.log("\n========================================");
  console.log("所有债务代币部署完成！");
  console.log("========================================");
  console.log("MultiSigWallet:", multiSigAddress);
  console.log("----------------------------------------");
  console.log("SP-Token (出借方凭证):");
  console.log("  SP-BUSD:", spTokenBUSDAddress);
  console.log("  SP-DAI:", spTokenDAIAddress);
  console.log("  SP-USDT:", spTokenUSDTAddress);
  console.log("----------------------------------------");
  console.log("JP-Token (借款方凭证):");
  console.log("  JP-BUSD:", jpTokenBUSDAddress);
  console.log("  JP-DAI:", jpTokenDAIAddress);
  console.log("  JP-USDT:", jpTokenUSDTAddress);
  console.log("========================================\n");

  console.log("📝 后续步骤:");
  console.log("1. 将这些地址更新到后端数据库的 pool 表中");
  console.log("2. 为 PledgePool 合约设置 Minter 权限");
  console.log("3. 调用 setPoolSpToken / setPoolJpToken 将代币关联到对应的池子");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

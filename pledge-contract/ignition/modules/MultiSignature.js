const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
require("dotenv").config();

module.exports = buildModule("MultiSignatureModule", (m) => {
  // 从环境变量读取所有者地址
  // 格式：地址1,地址2,地址3（用逗号分隔）
  const defaultOwners = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat 默认账户 #0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat 默认账户 #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat 默认账户 #2
  ];
  
  const ownersFromEnv = process.env.MULTISIG_OWNERS 
    ? process.env.MULTISIG_OWNERS.split(",").map(addr => addr.trim())
    : defaultOwners;
  
  const owners = m.getParameter("owners", ownersFromEnv);
  
  // 从环境变量读取所需确认数
  const defaultRequired = 2;
  const requiredFromEnv = process.env.MULTISIG_REQUIRED 
    ? parseInt(process.env.MULTISIG_REQUIRED) 
    : defaultRequired;
  
  const required = m.getParameter("required", requiredFromEnv);
  
  // 部署MultiSignature合约
  const multiSig = m.contract("MultiSignature", [owners, required]);
  
  return { multiSig };
});

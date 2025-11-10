const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MultiSignatureModule", (m) => {
  // 定义多签钱包的所有者地址（示例地址，实际部署时需要替换）
  const owners = m.getParameter("owners", [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // 示例地址1
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // 示例地址2
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // 示例地址3
  ]);
  
  // 定义所需的确认数（3个所有者中需要2个确认）
  const required = m.getParameter("required", 2);
  
  // 部署MultiSignature合约
  const multiSig = m.contract("MultiSignature", [owners, required]);
  
  return { multiSig };
});

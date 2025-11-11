require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  
  networks: {
    // 本地开发网络
    hardhat: {
      chainId: 31337,
    },
  }
};

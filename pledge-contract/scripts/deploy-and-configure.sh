#!/bin/bash

# =====================================================
# Pledge 协议一键部署和配置脚本
# =====================================================
# 
# 功能：自动化部署 PledgePool 和 Oracle 合约，并完成所有配置
# 
# 使用方法：
# ./deploy-and-configure.sh
# 
# =====================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置参数
NETWORK="bscTestnet"
MULTISIG_WALLET="0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4"

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║                                                   ║"
echo "║     🚀 Pledge 协议一键部署和配置脚本 🚀          ║"
echo "║                                                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 检查环境
echo -e "${BLUE}🔍 检查部署环境...${NC}"
echo "====================================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ 错误：未安装 Node.js${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# 检查 Hardhat
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ 错误：未安装 npx${NC}"
  exit 1
fi
echo -e "${GREEN}✅ npx 可用${NC}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}⚠️  警告：未安装 Docker（数据库更新将跳过）${NC}"
  DOCKER_AVAILABLE=false
else
  echo -e "${GREEN}✅ Docker 可用${NC}"
  DOCKER_AVAILABLE=true
fi

echo "====================================================="
echo ""

# 步骤 1：编译合约
echo -e "${BLUE}1️⃣  编译智能合约...${NC}"
echo "====================================================="
npx hardhat compile
echo -e "${GREEN}✅ 合约编译完成${NC}"
echo ""

# 步骤 2：部署合约
echo -e "${BLUE}2️⃣  部署 PledgePool 和 Oracle 合约...${NC}"
echo "====================================================="
echo -e "目标网络: ${YELLOW}$NETWORK${NC}"
echo -e "MultiSig 钱包: ${YELLOW}$MULTISIG_WALLET${NC}"
echo ""

npx hardhat ignition deploy ignition/modules/DeployPledgePool.js --network $NETWORK

echo ""
echo -e "${GREEN}✅ 合约部署完成${NC}"
echo ""

# 步骤 3：获取合约地址
echo -e "${BLUE}3️⃣  配置合约地址...${NC}"
echo "====================================================="
echo ""
echo -e "${YELLOW}请从上面的部署日志中找到合约地址，并输入：${NC}"
echo ""

read -p "PledgePool 合约地址: " PLEDGE_POOL_ADDRESS
read -p "Oracle 合约地址: " ORACLE_ADDRESS

# 验证地址格式
if [[ ! $PLEDGE_POOL_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo -e "${RED}❌ 错误：PledgePool 地址格式无效${NC}"
  exit 1
fi

if [[ ! $ORACLE_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo -e "${RED}❌ 错误：Oracle 地址格式无效${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ 地址验证通过${NC}"
echo ""

# 步骤 4：配置 PledgePool
echo -e "${BLUE}4️⃣  配置 PledgePool 合约...${NC}"
echo "====================================================="

export PLEDGE_POOL_ADDRESS=$PLEDGE_POOL_ADDRESS
export ORACLE_ADDRESS=$ORACLE_ADDRESS
export MULTISIG_WALLET_ADDRESS=$MULTISIG_WALLET

npx hardhat run scripts/configure-pledge-pool.js --network $NETWORK

echo ""
echo -e "${GREEN}✅ PledgePool 配置完成${NC}"
echo ""

# 步骤 5：配置 Oracle
echo -e "${BLUE}5️⃣  配置 Oracle 预言机...${NC}"
echo "====================================================="
echo ""
echo -e "${YELLOW}⚠️  注意：配置 Oracle 前，请确保已设置代币地址环境变量：${NC}"
echo "  - BUSD_ADDRESS"
echo "  - BTCB_ADDRESS"
echo "  - DAI_ADDRESS"
echo "  - USDT_ADDRESS"
echo ""

read -p "是否继续配置 Oracle？(y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  npx hardhat run scripts/configure-oracle.js --network $NETWORK
  echo ""
  echo -e "${GREEN}✅ Oracle 配置完成${NC}"
else
  echo -e "${YELLOW}⚠️  跳过 Oracle 配置（请稍后手动配置）${NC}"
fi
echo ""

# 步骤 6：验证部署
echo -e "${BLUE}6️⃣  验证合约部署...${NC}"
echo "====================================================="

npx hardhat run scripts/verify-deployment.js --network $NETWORK

echo ""
echo -e "${GREEN}✅ 部署验证完成${NC}"
echo ""

# 步骤 7：更新数据库
if [ "$DOCKER_AVAILABLE" = true ]; then
  echo -e "${BLUE}7️⃣  更新数据库配置...${NC}"
  echo "====================================================="
  
  chmod +x scripts/update-database.sh
  ./scripts/update-database.sh $PLEDGE_POOL_ADDRESS
  
  echo ""
  echo -e "${GREEN}✅ 数据库更新完成${NC}"
else
  echo -e "${YELLOW}⚠️  跳过数据库更新（Docker 不可用）${NC}"
  echo "请手动执行："
  echo "  ./scripts/update-database.sh $PLEDGE_POOL_ADDRESS"
fi
echo ""

# 完成
echo ""
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║                                                   ║"
echo "║          🎉 部署和配置全部完成！🎉               ║"
echo "║                                                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${GREEN}📋 部署摘要：${NC}"
echo "====================================================="
echo -e "PledgePool 地址:  ${GREEN}$PLEDGE_POOL_ADDRESS${NC}"
echo -e "Oracle 地址:      ${GREEN}$ORACLE_ADDRESS${NC}"
echo -e "MultiSig 钱包:    ${GREEN}$MULTISIG_WALLET${NC}"
echo -e "部署网络:         ${GREEN}$NETWORK${NC}"
echo "====================================================="
echo ""

echo -e "${YELLOW}📝 下一步操作：${NC}"
echo "1. 在 BSCScan 上验证合约源码："
echo -e "   ${BLUE}npx hardhat verify --network $NETWORK $PLEDGE_POOL_ADDRESS $MULTISIG_WALLET${NC}"
echo -e "   ${BLUE}npx hardhat verify --network $NETWORK $ORACLE_ADDRESS $MULTISIG_WALLET${NC}"
echo ""
echo "2. 更新 README.md 文档中的合约地址"
echo ""
echo "3. 更新前端配置文件中的合约地址"
echo ""
echo "4. 重启后端服务："
echo -e "   ${BLUE}docker-compose restart pledge-backend${NC}"
echo ""
echo "5. 在前端测试借贷功能"
echo ""

echo -e "${GREEN}🔗 有用的链接：${NC}"
echo "====================================================="
echo "PledgePool 合约: https://testnet.bscscan.com/address/$PLEDGE_POOL_ADDRESS"
echo "Oracle 合约: https://testnet.bscscan.com/address/$ORACLE_ADDRESS"
echo "MultiSig 钱包: https://testnet.bscscan.com/address/$MULTISIG_WALLET"
echo "====================================================="
echo ""

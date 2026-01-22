#!/bin/bash

# =====================================================
# 数据库更新执行脚本
# =====================================================
# 
# 功能：通过 Docker 更新数据库中的 PledgePool 合约地址
# 
# 使用方法：
# ./update-database.sh <PLEDGE_POOL_ADDRESS>
# 
# 示例：
# ./update-database.sh 0x1234567890abcdef1234567890abcdef12345678
# 
# =====================================================

set -e  # 遇到错误立即退出

# 配置参数
PLEDGE_POOL_ADDRESS=$1
CONTAINER_NAME="pledge-mysql"
DB_NAME="pledge_v21"
DB_USER="root"
DB_PASS="root123"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$PLEDGE_POOL_ADDRESS" ]; then
  echo -e "${RED}❌ 错误：请提供 PledgePool 合约地址${NC}"
  echo ""
  echo "使用方法："
  echo "  ./update-database.sh <PLEDGE_POOL_ADDRESS>"
  echo ""
  echo "示例："
  echo "  ./update-database.sh 0x1234567890abcdef1234567890abcdef12345678"
  exit 1
fi

# 验证地址格式（以太坊地址格式）
if [[ ! $PLEDGE_POOL_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo -e "${RED}❌ 错误：无效的以太坊地址格式${NC}"
  echo "地址必须是 42 个字符，以 0x 开头，后跟 40 个十六进制字符"
  exit 1
fi

echo -e "${BLUE}🔄 开始更新数据库中的 PledgePool 地址...${NC}"
echo "====================================================="
echo -e "合约地址: ${GREEN}$PLEDGE_POOL_ADDRESS${NC}"
echo -e "数据库容器: ${YELLOW}$CONTAINER_NAME${NC}"
echo -e "数据库名称: ${YELLOW}$DB_NAME${NC}"
echo "====================================================="
echo ""

# 检查 Docker 容器是否运行
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo -e "${RED}❌ 错误：Docker 容器 '$CONTAINER_NAME' 未运行${NC}"
  echo "请先启动数据库容器："
  echo "  docker-compose up -d"
  exit 1
fi

# 显示当前配置
echo -e "${BLUE}📋 当前数据库配置：${NC}"
docker exec -i $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASS $DB_NAME <<EOF
SELECT id, pool_name, pool_address, chain_id 
FROM poolbases 
WHERE chain_id = '97'
LIMIT 3;
EOF

echo ""
read -p "确认要更新所有 BSC 测试网（ChainId: 97）的池子地址吗？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  操作已取消${NC}"
  exit 0
fi

# 执行更新
echo ""
echo -e "${BLUE}🔄 正在更新数据库...${NC}"

docker exec -i $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASS $DB_NAME <<EOF
-- 更新 PledgePool 合约地址
UPDATE poolbases 
SET pool_address = '$PLEDGE_POOL_ADDRESS',
    updated_at = NOW()
WHERE chain_id = '97';

-- 显示更新结果
SELECT CONCAT('✅ 成功更新 ', COUNT(*), ' 条记录') as result
FROM poolbases 
WHERE chain_id = '97' AND pool_address = '$PLEDGE_POOL_ADDRESS';
EOF

# 验证更新结果
echo ""
echo -e "${BLUE}🔍 验证更新结果：${NC}"
docker exec -i $CONTAINER_NAME mysql -u$DB_USER -p$DB_PASS $DB_NAME <<EOF
SELECT id, pool_name, pool_address, chain_id 
FROM poolbases 
WHERE chain_id = '97'
LIMIT 3;
EOF

echo ""
echo -e "${GREEN}✅ 数据库更新完成！${NC}"
echo "====================================================="
echo ""
echo -e "${YELLOW}📝 下一步操作：${NC}"
echo "1. 重启后端服务以加载新配置"
echo "2. 在前端测试借贷功能"
echo "3. 验证合约交互是否正常"
echo ""

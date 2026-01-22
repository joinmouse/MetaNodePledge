#!/bin/bash

# 服务器端数据导入脚本
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_CONTAINER="pledge-mysql"
SERVER_DB="pledge_v22"
SERVER_USER="pledge_v22"
SERVER_PASS="pledge_v22"

echo -e "${BLUE}🚀 开始导入数据到服务器数据库...${NC}"
echo "====================================================="

# 检查服务器数据库状态
echo -e "${YELLOW}📊 检查服务器数据库当前状态...${NC}"
docker exec $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB -e "
SELECT 
    'poolbases' as table_name, COUNT(*) as record_count FROM poolbases
UNION ALL
SELECT 
    'token_info' as table_name, COUNT(*) as record_count FROM token_info  
UNION ALL
SELECT 
    'multi_sign' as table_name, COUNT(*) as record_count FROM multi_sign
UNION ALL
SELECT 
    'pooldata' as table_name, COUNT(*) as record_count FROM pooldata;
"

echo ""
read -p "确认要导入数据吗？这将会添加新数据到现有表中 (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📥 开始导入数据...${NC}"

# 导入数据
echo "导入 admin 数据..."
docker exec -i $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB < admin_data.sql

echo "导入 token_info 数据..."
docker exec -i $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB < token_info_data.sql

echo "导入 multi_sign 数据..."
docker exec -i $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB < multi_sign_data.sql

echo "导入 poolbases 数据..."
docker exec -i $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB < poolbases_data.sql

echo "导入 pooldata 数据..."
docker exec -i $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB < pooldata_data.sql

echo ""
echo -e "${GREEN}✅ 数据导入完成！${NC}"

# 验证导入结果
echo -e "${BLUE}🔍 验证导入结果...${NC}"
docker exec $SERVER_CONTAINER mysql -u$SERVER_USER -p$SERVER_PASS $SERVER_DB -e "
SELECT 
    'poolbases' as table_name, COUNT(*) as record_count FROM poolbases
UNION ALL
SELECT 
    'token_info' as table_name, COUNT(*) as record_count FROM token_info  
UNION ALL
SELECT 
    'multi_sign' as table_name, COUNT(*) as record_count FROM multi_sign
UNION ALL
SELECT 
    'pooldata' as table_name, COUNT(*) as record_count FROM pooldata;
"

echo ""
echo -e "${GREEN}🎉 数据迁移完成！${NC}"
echo "====================================================="

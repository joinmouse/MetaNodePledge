#!/bin/bash

# 数据导出脚本 - 将本地测试数据导出到服务器
# 使用方法: ./export_local_data.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 开始导出本地测试数据...${NC}"
echo "====================================================="

# 本地数据库配置
LOCAL_CONTAINER="pledge-mysql"
LOCAL_DB="pledge_v21"
LOCAL_USER="pledge_v21"
LOCAL_PASS="pledge_v21"

# 服务器配置
SERVER_IP="111.230.6.64"
SERVER_SSH_USER="ubuntu"
SERVER_SSH_PORT="22"
SERVER_CONTAINER="pledge-mysql"
SERVER_DB="pledge_v22"
SERVER_USER="pledge_v22"
SERVER_PASS="pledge_v22"

# 创建导出目录
EXPORT_DIR="./data_export"
mkdir -p $EXPORT_DIR

echo -e "${YELLOW}📊 检查本地数据库状态...${NC}"
docker exec $LOCAL_CONTAINER mysql -u$LOCAL_USER -p$LOCAL_PASS $LOCAL_DB -e "
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
echo -e "${BLUE}📤 导出数据表...${NC}"

# 1. 导出 poolbases 表数据
echo "导出 poolbases 表..."
docker exec $LOCAL_CONTAINER mysqldump -u$LOCAL_USER -p$LOCAL_PASS \
    --no-create-info --complete-insert --single-transaction \
    $LOCAL_DB poolbases > $EXPORT_DIR/poolbases_data.sql

# 2. 导出 token_info 表数据  
echo "导出 token_info 表..."
docker exec $LOCAL_CONTAINER mysqldump -u$LOCAL_USER -p$LOCAL_PASS \
    --no-create-info --complete-insert --single-transaction \
    $LOCAL_DB token_info > $EXPORT_DIR/token_info_data.sql

# 3. 导出 multi_sign 表数据
echo "导出 multi_sign 表..."
docker exec $LOCAL_CONTAINER mysqldump -u$LOCAL_USER -p$LOCAL_PASS \
    --no-create-info --complete-insert --single-transaction \
    $LOCAL_DB multi_sign > $EXPORT_DIR/multi_sign_data.sql

# 4. 导出 pooldata 表数据
echo "导出 pooldata 表..."
docker exec $LOCAL_CONTAINER mysqldump -u$LOCAL_USER -p$LOCAL_PASS \
    --no-create-info --complete-insert --single-transaction \
    $LOCAL_DB pooldata > $EXPORT_DIR/pooldata_data.sql

# 5. 导出 admin 表数据
echo "导出 admin 表..."
docker exec $LOCAL_CONTAINER mysqldump -u$LOCAL_USER -p$LOCAL_PASS \
    --no-create-info --complete-insert --single-transaction \
    $LOCAL_DB admin > $EXPORT_DIR/admin_data.sql

echo ""
echo -e "${GREEN}✅ 数据导出完成！${NC}"
echo "导出文件位置: $EXPORT_DIR/"
ls -la $EXPORT_DIR/

echo ""
echo -e "${BLUE}🔄 创建服务器导入脚本...${NC}"

# 创建服务器端导入脚本
cat > $EXPORT_DIR/import_to_server.sh << 'EOF'
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
EOF

chmod +x $EXPORT_DIR/import_to_server.sh

echo ""
echo -e "${GREEN}✅ 导出脚本创建完成！${NC}"
echo ""
echo -e "${YELLOW}📝 下一步操作：${NC}"
echo "1. 将 $EXPORT_DIR 目录上传到服务器"
echo "2. 在服务器上运行: ./import_to_server.sh"
echo ""
echo -e "${BLUE}💡 快速上传命令：${NC}"
echo "scp -P $SERVER_SSH_PORT -r $EXPORT_DIR $SERVER_SSH_USER@$SERVER_IP:/tmp/"
echo ""
echo -e "${BLUE}💡 服务器执行命令：${NC}"
echo "ssh -p $SERVER_SSH_PORT $SERVER_SSH_USER@$SERVER_IP 'cd /tmp/data_export && ./import_to_server.sh'"
echo ""

# 询问是否直接上传并导入
echo -e "${YELLOW}🚀 是否直接上传并导入数据到服务器？${NC}"
read -p "输入 'y' 直接执行，或按回车键跳过: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}📤 正在上传数据到服务器...${NC}"
    
    # 上传数据文件到服务器
    scp -P $SERVER_SSH_PORT -r $EXPORT_DIR $SERVER_SSH_USER@$SERVER_IP:/tmp/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 数据上传成功！${NC}"
        echo ""
        echo -e "${BLUE}📥 开始在服务器上导入数据...${NC}"
        
        # 在服务器上执行导入
        ssh -p $SERVER_SSH_PORT $SERVER_SSH_USER@$SERVER_IP << 'ENDSSH'
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

cd /tmp/data_export

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
ENDSSH
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 数据导入成功完成！${NC}"
            echo -e "${BLUE}🔗 现在可以访问前端页面查看数据：http://localhost:8000${NC}"
        else
            echo -e "${RED}❌ 数据导入失败${NC}"
        fi
    else
        echo -e "${RED}❌ 数据上传失败${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  跳过自动上传，请手动执行上述命令${NC}"
fi

echo ""
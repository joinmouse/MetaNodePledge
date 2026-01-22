#!/bin/bash

# 配置变量
SERVER_USER="ubuntu"
SERVER_HOST="111.230.6.64"
SSH_PORT="22"

echo "=== 更新数据库借贷时间 ==="

# 计算时间戳
CURRENT_TIME=$(date +%s)
SETTLE_TIME=$((CURRENT_TIME - 3600))  # 当前时间 - 1小时
END_TIME=$((CURRENT_TIME + 7 * 24 * 3600))  # 当前时间 + 7天

echo "[1/3] 时间配置："
echo "  当前时间: $(date -r $CURRENT_TIME '+%Y-%m-%d %H:%M:%S')"
echo "  Settle Time: $(date -r $SETTLE_TIME '+%Y-%m-%d %H:%M:%S')"
echo "  End Time: $(date -r $END_TIME '+%Y-%m-%d %H:%M:%S')"
echo ""

# 执行SQL更新
echo "[2/3] 连接服务器执行SQL更新..."

ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST << ENDSSH
# 进入MySQL容器执行SQL
docker exec -i pledge-mysql mysql -u pledge_v22 -ppledge_v22 pledge_v22 << 'EOF'
UPDATE poolbases
SET 
    settle_time = $SETTLE_TIME,
    end_time = $END_TIME,
    state = 0,
    lend_supply = 0,
    borrow_supply = 0
WHERE chain_id IN ('56', '97');

SELECT 
    CONCAT('✓ 更新完成，影响行数: ', ROW_COUNT()) AS result;
EOF
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ SQL执行失败"
    exit 1
fi

echo "✓ SQL执行完成"
echo ""

# 验证结果
echo "[3/3] 验证更新结果..."

ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST << 'ENDSSH'
docker exec -i pledge-mysql mysql -u pledge_v22 -ppledge_v22 pledge_v22 << 'EOF'
SELECT 
    chain_id AS '链ID',
    pool_id AS 'Pool ID',
    lend_token_symbol AS '代币',
    FROM_UNIXTIME(settle_time) AS '开始时间',
    FROM_UNIXTIME(end_time) AS '结束时间',
    state AS '状态',
    lend_supply AS '借出',
    borrow_supply AS '借入'
FROM poolbases
WHERE chain_id IN ('56', '97')
ORDER BY chain_id, pool_id;
EOF
ENDSSH

echo ""
echo "=== 更新完成 ==="

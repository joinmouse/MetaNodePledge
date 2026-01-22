#!/bin/bash

# 配置变量
SERVER_USER="ubuntu"
SERVER_HOST="111.230.6.64"
SERVER_PATH="/home/ubuntu/pledge"
SSH_PORT="22"

echo "=== Pledge 后端部署 ==="

# 检查是否首次部署
if [ "$1" = "init" ]; then
    echo "[初始化] 首次部署，上传所有配置文件..."
    
    ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_PATH/config $SERVER_PATH/sql $SERVER_PATH/log"
    
    # 上传 docker-compose.yml
    scp -P $SSH_PORT docker-compose.yml $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
    
    # 上传配置文件
    scp -P $SSH_PORT pledge-backend/config/config.docker.toml $SERVER_USER@$SERVER_HOST:$SERVER_PATH/config/config.toml
    
    # 上传 SQL 初始化文件
    scp -P $SSH_PORT pledge-backend/sql/pledge.sql $SERVER_USER@$SERVER_HOST:$SERVER_PATH/sql/
    
    echo "✓ 配置文件上传完成"
    echo ""
    echo "请在服务器上执行以下命令启动服务："
    echo "  cd $SERVER_PATH && docker-compose up -d"
    echo ""
    echo "首次启动后，再次运行本脚本（不带参数）即可更新代码"
    exit 0
fi

# 1. 本地编译
echo "[1/4] 编译后端..."

if ! command -v go &> /dev/null; then
    echo "错误：未找到 Go 环境"
    exit 1
fi

# 编译 API
cd pledge-backend/api
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o pledge-api pledge_api.go
if [ $? -ne 0 ]; then
    echo "API 编译失败"
    exit 1
fi
cd ../..

# 编译定时任务
cd pledge-backend/schedule
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o pledge-task pledge_task.go
if [ $? -ne 0 ]; then
    echo "定时任务编译失败"
    exit 1
fi
cd ../..

echo "✓ 编译完成"

# 2. 上传到服务器
echo "[2/4] 上传到服务器..."

ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_PATH"

# 先上传到临时目录，再移动到目标位置并设置权限
scp -P $SSH_PORT pledge-backend/api/pledge-api $SERVER_USER@$SERVER_HOST:/tmp/pledge-api
scp -P $SSH_PORT pledge-backend/schedule/pledge-task $SERVER_USER@$SERVER_HOST:/tmp/pledge-task

if [ $? -ne 0 ]; then
    echo "上传失败"
    exit 1
fi

# 移动文件并设置正确的权限
ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST "sudo mv /tmp/pledge-api /tmp/pledge-task $SERVER_PATH/ && sudo chmod +x $SERVER_PATH/pledge-api $SERVER_PATH/pledge-task && sudo chown ubuntu:ubuntu $SERVER_PATH/pledge-api $SERVER_PATH/pledge-task"

echo "✓ 上传完成"

# 3. 重启服务
echo "[3/4] 重启服务..."

ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd /home/ubuntu/pledge
chmod +x pledge-api pledge-task
docker-compose restart pledge-api pledge-task
sleep 3
docker-compose ps
ENDSSH

if [ $? -ne 0 ]; then
    echo "重启失败"
    exit 1
fi

echo "✓ 重启完成"

# 4. 测试
echo "[4/4] 测试 API..."
sleep 2
ssh -p $SSH_PORT $SERVER_USER@$SERVER_HOST "curl -s http://localhost:8080/api/v2/poolBaseInfo?chainId=97&version=22" | head -n 5

echo ""
echo "=== 部署完成 ==="
echo "API: http://$SERVER_HOST:8080"

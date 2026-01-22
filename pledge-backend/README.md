# Pledge DeFi Backend Service

Pledge DeFi 后端服务是一个基于 Go 语言开发的 DeFi 借贷协议数据服务，为前端提供借贷池信息、代币价格、多签管理等核心功能。

## 🏗️ 项目架构

项目分为两个独立服务：

- **API 服务** (`api/`) - 提供 RESTful API 接口

- **定时任务服务** (`schedule/`) - 执行后台数据同步和监控任务

## 🚀 核心功能

### API 服务

- **借贷池管理**
  - 借贷池基础信息查询 (`/api/v2/poolBaseInfo`)
  - 借贷池数据信息查询 (`/api/v2/poolDataInfo`)
  - 借贷池搜索功能 (`/api/v2/pool/search`)
  - 债务代币列表 (`/api/v2/pool/debtTokenList`)

- **代币管理**
  - 代币列表查询 (`/api/v2/token`)
  - 代币价格获取 (集成 KuCoin 交易所)
  - 代币 Logo 和元数据管理

- **多签管理**
  - 多签设置 (`/api/v2/pool/setMultiSign`)
  - 多签查询 (`/api/v2/pool/getMultiSign`)

- **用户系统**
  - 用户登录/登出
  - JWT Token 验证
  - CORS 跨域支持

### 定时任务服务

- **价格同步**
  - 每 1 分钟更新合约代币价格
  - 每 30 分钟保存 PLGR 代币价格
  - 支持主网和测试网价格获取

- **数据同步**
  - 每 2 分钟更新所有借贷池信息
  - 每 2 小时更新代币符号信息
  - 每 2 小时更新代币 Logo 信息

- **监控告警**
  - 每 30 分钟监控余额和系统状态
  - 异常状态邮件通知

## 🛠️ 技术栈

- **框架**: Gin Web Framework
- **数据库**: MySQL + Redis
- **定时任务**: gocron
- **配置管理**: TOML
- **日志**: 自定义日志模块
- **验证**: go-playground/validator
- **WebSocket**: 实时价格推送

## 📊 数据模型

### 核心数据表

- `poolbases` - 借贷池基础信息
- `pooldata` - 借贷池数据统计
- `token_info` - 代币信息
- `multi_sign` - 多签配置
- `admin` - 管理员账户

## 🔧 配置说明

配置文件位于 `config/` 目录：

- `configV21.toml` - 主网配置
- `configV22.toml` - 测试网配置

配置项包括：

- 数据库连接 (MySQL + Redis)
- 区块链网络配置 (BSC 主网/测试网)
- 合约地址配置
- JWT 密钥和过期时间
- 邮件服务配置
- 系统阈值设置

## 🚀 快速开始

### 环境要求

- Go 1.19+
- MySQL 5.7+
- Redis 6.0+

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p < db/pledge.sql
```

### 2. 配置文件

复制并修改配置文件：

```bash
cp config/configV22.toml config/config.toml
# 编辑 config.toml 中的数据库和 Redis 配置
```

### 3. 启动 API 服务

```bash
cd api
go mod download
go run pledge_api.go
```

### 4. 启动定时任务服务

```bash
cd schedule
go mod download
go run pledge_task.go
```

## 📡 API 接口文档

### 公共接口 (无需认证)

```
GET  /api/v2/poolBaseInfo      - 借贷池基础信息
GET  /api/v2/poolDataInfo      - 借贷池数据信息
GET  /api/v2/token             - 代币列表
GET  /api/v2/price             - PLGR 代币价格
POST /api/v2/user/login        - 用户登录
```

### 需要认证的接口

```
POST /api/v2/pool/search        - 借贷池搜索
POST /api/v2/pool/debtTokenList - 债务代币列表
POST /api/v2/pool/setMultiSign  - 设置多签
POST /api/v2/pool/getMultiSign  - 获取多签信息
POST /api/v2/user/logout        - 用户登出
```

## 🔒 安全特性

- JWT Token 认证
- CORS 跨域保护
- 输入参数验证
- SQL 注入防护
- Redis 缓存优化

## 📈 性能优化

- Redis 缓存热点数据
- 数据库连接池管理
- 定时任务分布式执行
- WebSocket 实时数据推送

## 📝 部署说明

### 使用 systemd 服务 (Linux)

```bash
# API 服务
sudo cp api/pledge-api.service /etc/systemd/system/
sudo systemctl enable pledge-api
sudo systemctl start pledge-api

# 定时任务服务
sudo cp schedule/pledge-task.service /etc/systemd/system/
sudo systemctl enable pledge-task
sudo systemctl start pledge-task
```

### Docker 部署

```dockerfile
# 构建镜像
docker build -t pledge-backend .

# 运行容器
docker run -d \
  --name pledge-api \
  -p 8080:8080 \
  -v /path/to/config:/app/config \
  pledge-backend
```

## 🔍 监控与日志

- 日志文件位于 `log/` 目录
- 支持错误级别分类 (INFO, ERROR, DEBUG)
- 可集成外部日志收集系统

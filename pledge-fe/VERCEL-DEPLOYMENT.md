# Vercel 部署指南

## 快速部署到 Vercel

### 1. 准备工作

确保你的项目已经推送到 GitHub/GitLab/Bitbucket。

### 2. 部署步骤

1. **访问 Vercel**
   - 前往 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择你的 `MetaNodePledge` 仓库
   - 选择 `pledge-fe` 目录作为根目录

3. **配置构建设置**
   - Framework Preset: `Other`
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **环境变量设置**
   ```
   REACT_APP_CHAIN_ID=56
   ```

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成

### 3. 自动部署

每次推送到主分支时，Vercel 会自动重新部署。

### 4. 自定义域名（可选）

在 Vercel 项目设置中可以添加自定义域名。

### 5. 故障排除

如果构建失败：
1. 检查 Node.js 版本是否兼容
2. 确认所有依赖都已正确安装
3. 查看构建日志中的错误信息

### 6. 本地测试

部署前可以本地测试：
```bash
npm run build
# 检查 dist 目录是否正确生成
```

## 配置文件说明

- `vercel.json`: Vercel 部署配置
  - 配置了 SPA 路由重定向
  - 设置了静态资源路径
  - 配置了环境变量

## 优势

- ✅ 零配置部署
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 自动构建和部署
- ✅ 预览部署（PR）
- ✅ 性能监控

现在你可以直接将项目部署到 Vercel 了！🚀
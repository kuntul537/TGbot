# GitHub Actions Docker Build

本项目配置了 GitHub Actions 自动构建 Docker 镜像。

## 📦 镜像地址

镜像发布到 GitHub Container Registry (GHCR)：

```
ghcr.io/YOUR_USERNAME/tgbot:latest
```

## 🚀 触发条件

### 完整版 (docker-build.yml)
- Push 到 `main` 或 `master` 分支
- 创建标签 (如 `v1.0.0`)
- 提交 Pull Request

### 简化版 (docker-build-simple.yml)
- Push 到 `main` 或 `master` 分支

## 🏷️ 镜像标签

**完整版自动生成的标签：**
- `latest` - 最新的 main/master 分支
- `<branch-name>` - 分支名
- `<branch>-<sha>` - 分支名+提交哈希
- `v1.0.0` - 版本标签
- `1.0` - 主版本+次版本
- `1` - 主版本

**简化版标签：**
- `latest` - 最新构建
- `<sha>` - 提交哈希（短）

## 📥 拉取镜像

### 1. 登录 GitHub Container Registry

```bash
# 使用 GitHub Personal Access Token
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 或使用密码登录
docker login ghcr.io
```

### 2. 拉取镜像

```bash
# 拉取最新版本
docker pull ghcr.io/YOUR_USERNAME/tgbot:latest

# 拉取特定版本
docker pull ghcr.io/YOUR_USERNAME/tgbot:v1.0.0

# 拉取特定提交
docker pull ghcr.io/YOUR_USERNAME/tgbot:abc1234
```

## 🔧 使用镜像

### 方法一：直接运行

```bash
docker run -d \
  --name telegram-bot \
  --restart unless-stopped \
  -e BOT_TOKEN="你的Bot_Token" \
  -e OWNER_ID="你的用户ID" \
  -e SUPABASE_URL="你的Supabase_URL" \
  -e SUPABASE_KEY="你的Supabase_Key" \
  ghcr.io/YOUR_USERNAME/tgbot:latest
```

### 方法二：使用 docker-compose

修改 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  telegram-bot:
    image: ghcr.io/YOUR_USERNAME/tgbot:latest
    container_name: telegram-bot
    restart: unless-stopped
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - OWNER_ID=${OWNER_ID}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - LOG_LEVEL=info
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

然后启动：

```bash
docker-compose up -d
```

## 🔑 GitHub Token 权限

如果需要在本地访问私有镜像，需要创建 GitHub Personal Access Token：

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限：
   - ✅ `read:packages` - 读取包
   - ✅ `write:packages` - 写入包（如需推送）
4. 复制 token 并保存

## 📊 查看构建状态

在 GitHub 仓库页面：
- 点击 **Actions** 标签
- 查看工作流运行状态
- 点击具体的运行查看详细日志

## 🔍 查看镜像

在 GitHub 仓库页面：
- 点击右侧的 **Packages**
- 或访问：https://github.com/YOUR_USERNAME?tab=packages

## 💡 提示

- 镜像默认是公开的，可以在仓库设置中修改为私有
- 构建时会自动使用 GitHub Actions 缓存加速
- 支持多架构构建 (amd64, arm64)
- 每次 push 都会触发构建

## 🚨 注意事项

1. **首次使用**：确保 GitHub Actions 已启用
2. **权限问题**：确保仓库的 Actions 有 `packages: write` 权限
3. **镜像可见性**：默认继承仓库的可见性设置
4. **存储限制**：GitHub 提供免费的包存储空间

## 📝 自定义构建

如果需要修改构建配置，编辑 `.github/workflows/docker-build.yml`：

- 修改触发条件
- 添加构建参数
- 修改标签策略
- 添加测试步骤

## 🔗 相关链接

- [GitHub Packages 文档](https://docs.github.com/en/packages)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Action](https://github.com/docker/build-push-action)

## 拉取镜像

```bash
# 拉取最新版本
docker pull ghcr.io/ham0mer/tgbot:latest

# 拉取特定版本
docker pull ghcr.io/ham0mer/tgbot:v1.0.0
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
  -v $(pwd)/logs:/app/logs \
  ghcr.io/ham0mer/tgbot:latest
```

### 方法二：使用 docker-compose

修改 `docker-compose.yml`：

```yaml
services:
  telegram-bot:
    image: ghcr.io/ham0mer/tgbot:latest
    container_name: telegram-bot
    restart: unless-stopped
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - OWNER_ID=${OWNER_ID}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

然后启动：

```bash
docker compose up -d
```

### 启动并查看日志

```bash
docker compose up -d && docker compose logs -f
```

## 🔄 更新镜像

### 更新到最新版本

```bash
docker compose pull && docker compose down && docker compose up -d && docker compose logs -f
docker image prune
```
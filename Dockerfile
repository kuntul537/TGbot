# 使用 Alpine Linux 最小镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 全局安装 PM2
RUN npm install -g pm2

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建日志目录
RUN mkdir -p /app/logs

# 使用 PM2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.js"]

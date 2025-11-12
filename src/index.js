const Bot = require('./bot');
const logger = require('./utils/logger');
const { getInstance: getDatabase } = require('./utils/supabaseDatabase');

/**
 * 主入口文件
 */

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', {
    reason,
    promise
  });
});

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('接收到 SIGINT 信号，正在关闭机器人...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('接收到 SIGTERM 信号，正在关闭机器人...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

// 创建并启动机器人
let bot = null;

async function start() {
  try {
    // 初始化 Supabase 数据库
    const db = getDatabase();
    await db.initialize();
    
    // 启动定期清理任务
    db.startCleanupTask();
    
    // 创建并启动机器人
    bot = new Bot();
    bot.start();
  } catch (error) {
    logger.error('启动失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// 启动
start();

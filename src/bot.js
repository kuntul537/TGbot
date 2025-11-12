const TelegramBot = require('node-telegram-bot-api');
const config = require('./utils/config');
const logger = require('./utils/logger');
const MessageHandler = require('./handlers/messageHandler');

/**
 * Bot 主类
 */
class Bot {
  constructor() {
    this.token = config.getBotToken();
    this.bot = null;
    this.messageHandler = null;
  }

  /**
   * 初始化机器人
   */
  initialize() {
    try {
      // 创建 bot 实例
      this.bot = new TelegramBot(this.token, { polling: true });

      // 创建消息处理器
      this.messageHandler = new MessageHandler(this.bot);

      // 注册事件监听器
      this.registerListeners();

      logger.info('机器人初始化成功');
      logger.info('主人ID: ' + config.getOwnerId());

    } catch (error) {
      logger.error('机器人初始化失败', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 注册事件监听器
   */
  registerListeners() {
    // 监听 /start 命令
    this.bot.onText(/\/start/, (msg) => {
      this.messageHandler.handleStartCommand(msg);
    });

    // 监听 /block 命令（主人拉黑用户）
    // 支持两种方式：/block（回复消息）或 /block 123456（直接指定用户ID）
    this.bot.onText(/\/block(?:\s+(\d+))?/, (msg, match) => {
      const userId = msg.from.id;
      const ownerId = config.getOwnerId();
      
      // 只有主人可以使用此命令
      if (userId === ownerId) {
        const targetUserId = match[1]; // 从命令中提取的用户ID
        if (targetUserId) {
          // 直接指定用户ID
          this.messageHandler.handleBlockUserById(msg, targetUserId);
        } else if (msg.reply_to_message) {
          // 回复消息方式
          this.messageHandler.handleBlockUser(msg);
        } else {
          this.bot.sendMessage(
            ownerId,
            '❌ 使用方法：\n' +
            '1. 回复用户消息并发送 /block\n' +
            '2. 直接发送 /block 用户ID\n\n' +
            '例如：/block 123456789'
          );
        }
      }
    });

    // 监听 /unblock 命令（主人解除拉黑）
    // 支持两种方式：/unblock（回复消息）或 /unblock 123456（直接指定用户ID）
    this.bot.onText(/\/unblock(?:\s+(\d+))?/, (msg, match) => {
      const userId = msg.from.id;
      const ownerId = config.getOwnerId();
      
      // 只有主人可以使用此命令
      if (userId === ownerId) {
        const targetUserId = match[1]; // 从命令中提取的用户ID
        if (targetUserId) {
          // 直接指定用户ID
          this.messageHandler.handleUnblockUserById(msg, targetUserId);
        } else if (msg.reply_to_message) {
          // 回复消息方式
          this.messageHandler.handleUnblockUser(msg);
        } else {
          this.bot.sendMessage(
            ownerId,
            '❌ 使用方法：\n' +
            '1. 回复用户消息并发送 /unblock\n' +
            '2. 直接发送 /unblock 用户ID\n\n' +
            '例如：/unblock 123456789'
          );
        }
      }
    });

    // 监听文本消息
    this.bot.on('message', (msg) => {
      // 排除命令消息（/start, /block, /unblock）
      if (msg.text && !msg.text.startsWith('/')) {
        this.messageHandler.handleTextMessage(msg);
      }
    });

    // 监听图片消息
    this.bot.on('photo', (msg) => {
      this.messageHandler.handlePhotoMessage(msg);
    });

    // 监听轮询错误
    this.bot.on('polling_error', (error) => {
      logger.error('轮询错误', {
        code: error.code,
        message: error.message
      });
    });

    // 监听 webhook 错误
    this.bot.on('webhook_error', (error) => {
      logger.error('Webhook 错误', {
        message: error.message,
        stack: error.stack
      });
    });

    logger.info('事件监听器注册完成');
  }

  /**
   * 启动机器人
   */
  start() {
    try {
      this.initialize();
      
      logger.info('='.repeat(50));
      logger.info('🤖 Telegram 消息转发机器人已启动');
      logger.info('✅ 智能广告过滤系统已激活');
      logger.info('📡 正在监听消息...');
      logger.info('='.repeat(50));

      // 向主人发送启动通知
      this.bot.sendMessage(
        config.getOwnerId(),
        '🤖 机器人已启动！\n\n' +
        '✅ 状态: 运行中\n' +
        '🛡️ 智能过滤: 已启用\n' +
        `⏰ 时间: ${new Date().toLocaleString('zh-CN')}`
      ).catch(error => {
        logger.warn('无法向主人发送启动通知', {
          error: error.message
        });
      });

    } catch (error) {
      logger.error('机器人启动失败', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  /**
   * 停止机器人
   */
  stop() {
    if (this.bot) {
      this.bot.stopPolling();
      logger.info('机器人已停止');
    }
  }
}

module.exports = Bot;

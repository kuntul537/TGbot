require('dotenv').config();

/**
 * 配置管理模块
 */
class Config {
  constructor() {
    this.botToken = process.env.BOT_TOKEN;
    this.ownerId = process.env.OWNER_ID;
    this.logLevel = process.env.LOG_LEVEL || 'info';

    this.validate();
  }

  /**
   * 验证必要配置是否存在
   */
  validate() {
    if (!this.botToken) {
      throw new Error('缺少 BOT_TOKEN 配置，请在 .env 文件中设置');
    }

    if (!this.ownerId) {
      throw new Error('缺少 OWNER_ID 配置，请在 .env 文件中设置');
    }

    // 验证 ownerId 是否为数字
    if (isNaN(parseInt(this.ownerId))) {
      throw new Error('OWNER_ID 必须是有效的数字');
    }
  }

  /**
   * 获取机器人 Token
   */
  getBotToken() {
    return this.botToken;
  }

  /**
   * 获取主人 ID
   */
  getOwnerId() {
    return parseInt(this.ownerId);
  }

  /**
   * 获取日志级别
   */
  getLogLevel() {
    return this.logLevel;
  }
}

module.exports = new Config();

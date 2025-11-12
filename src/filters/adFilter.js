const logger = require('../utils/logger');
const svgCaptcha = require('svg-captcha');
const { getInstance: getDatabase } = require('../utils/supabaseDatabase');

/**
 * 用户验证管理器
 * 管理用户验证状态和验证码验证
 */
class UserVerification {
  constructor() {
    // 获取数据库实例
    this.db = getDatabase();
    
    // 验证码有效期（毫秒）- 5分钟
    this.captchaExpiry = 5 * 60 * 1000;
    
    // 最大验证尝试次数
    this.maxAttempts = 3;
  }

  /**
   * 检查用户是否已验证
   * @param {number} userId - 用户ID
   * @returns {boolean}
   */
  async isVerified(userId) {
    return await this.db.isUserVerified(userId);
  }

  /**
   * 检查用户是否有待验证的验证码
   * @param {number} userId - 用户ID
   * @returns {boolean}
   */
  async hasPendingVerification(userId) {
    const pending = await this.db.getPendingVerification(userId);
    return pending !== null;
  }

  /**
   * 生成验证码
   * @returns {Object} { text: '验证码文本', data: 'SVG数据' }
   */
  generateCaptcha() {
    // 配置验证码选项
    const captcha = svgCaptcha.create({
      size: 4,           // 验证码长度
      noise: 2,          // 干扰线条数
      color: true,       // 彩色
      background: '#f0f0f0',  // 背景色
      fontSize: 60,      // 字体大小
      width: 200,        // 宽度
      height: 80         // 高度
    });

    return {
      text: captcha.text.toLowerCase(), // 转小写，不区分大小写
      data: captcha.data
    };
  }

  /**
   * 为用户创建验证码
   * @param {number} userId - 用户ID
   * @returns {string} SVG验证码数据
   */
  async createVerificationForUser(userId) {
    const captcha = this.generateCaptcha();
    
    // 保存到数据库
    await this.db.savePendingVerification(userId, captcha.text);

    logger.info(`🔐 生成验证码 | 用户ID: ${userId} | 验证码: ${captcha.text}`);

    return captcha.data;
  }

  /**
   * 验证用户提交的验证码
   * @param {number} userId - 用户ID
   * @param {string} userInput - 用户输入的验证码
   * @param {string} username - 用户名
   * @returns {Object} { success: boolean, message: string, remainingAttempts?: number }
   */
  async verifyCaptcha(userId, userInput, username = '用户') {
    const verification = await this.db.getPendingVerification(userId);
    
    if (!verification) {
      return {
        success: false,
        message: '没有待验证的验证码，请先获取验证码'
      };
    }

    // 增加尝试次数
    const currentAttempts = await this.db.incrementVerificationAttempts(userId);

    // 检查是否超过最大尝试次数
    if (currentAttempts > this.maxAttempts) {
      await this.db.deletePendingVerification(userId);
      
      // 记录验证失败
      await this.db.recordFailedVerification(userId, username, '验证失败次数过多');
      
      // 自动拉黑该用户
      await this.db.blockUser(userId);
      
      logger.warn(`🚫 验证失败次数过多，已自动拉黑 | 用户: ${username} (${userId})`);
      return {
        success: false,
        message: '验证失败次数过多，您已被禁止使用此机器人'
      };
    }

    // 验证码比对（不区分大小写）
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedCode = verification.code.toLowerCase();
    const isCorrect = normalizedInput === normalizedCode;

    if (isCorrect) {
      // 验证成功，添加到已验证列表
      await this.db.saveVerifiedUser(userId, username);
      
      // 移除待验证记录
      await this.db.deletePendingVerification(userId);

      logger.info(`✅ 验证成功 | 用户: ${username} (${userId})`);

      return {
        success: true,
        message: '验证成功！'
      };
    } else {
      // 验证失败
      const remainingAttempts = this.maxAttempts - currentAttempts;
      
      logger.warn(`❌ 验证失败 | 用户ID: ${userId} | 剩余机会: ${remainingAttempts}`);

      return {
        success: false,
        message: `验证码错误，还有 ${remainingAttempts} 次机会`,
        remainingAttempts
      };
    }
  }

  /**
   * 手动验证用户（主人可以手动通过某个用户）
   * @param {number} userId - 用户ID
   * @param {string} username - 用户名
   */
  async manuallyVerifyUser(userId, username = '用户') {
    await this.db.saveVerifiedUser(userId, username);
    
    // 清除待验证记录
    await this.db.deletePendingVerification(userId);

    logger.info(`👑 手动验证用户 | 用户: ${username} (${userId})`);
  }

  /**
   * 移除用户验证状态（用于测试或封禁）
   * @param {number} userId - 用户ID
   */
  async removeVerification(userId) {
    // Supabase 不需要单独移除已验证用户
    await this.db.deletePendingVerification(userId);
    logger.info(`🗑️ 移除验证状态 | 用户ID: ${userId}`);
  }

  /**
   * 获取验证统计信息
   * @returns {Object}
   */
  async getStats() {
    return await this.db.getStats();
  }
}

module.exports = new UserVerification();

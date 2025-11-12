const logger = require('../utils/logger');
const config = require('../utils/config');
const userVerification = require('../filters/adFilter');
const { getInstance: getDatabase } = require('../utils/supabaseDatabase');
const sharp = require('sharp');

/**
 * 消息处理器类
 */
class MessageHandler {
  constructor(bot) {
    this.bot = bot;
    this.ownerId = config.getOwnerId();
    
    // 获取数据库实例
    this.db = getDatabase();
  }

  /**
   * 处理文本消息
   */
  async handleTextMessage(msg) {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name || '未知用户';
      const text = msg.text;

      logger.info('收到文本消息', {
        userId,
        username,
        text: text.substring(0, 100)
      });

      // 如果是主人发送的消息，检查是否是回复消息
      if (userId === this.ownerId) {
        // 检查是否是回复消息
        if (msg.reply_to_message) {
          await this.handleOwnerReply(msg);
        } else {
          logger.debug('主人发送的普通消息，跳过处理');
        }
        return;
      }

      // 检查用户是否被拉黑
      if (await this.db.isUserBlocked(userId)) {
        logger.info('拉黑用户尝试发送消息', { userId, username });
        await this.bot.sendMessage(
          chatId,
          '❌ 抱歉，您已被拉黑，无法发送消息。'
        );
        return;
      }

      // 检查用户是否已验证
      if (!await userVerification.isVerified(userId)) {
        // 用户未验证，检查是否有待验证的验证码
        if (await userVerification.hasPendingVerification(userId)) {
          // 用户正在验证过程中，验证他们输入的验证码
          const result = await userVerification.verifyCaptcha(userId, text, username);
          
          if (result.success) {
            // 验证成功
            await this.bot.sendMessage(
              chatId,
              '✅ 验证成功！\n\n现在你可以向我发送消息了，我会帮你转发给主人。'
            );
            
            // 通知主人有新用户通过验证
            await this.bot.sendMessage(
              this.ownerId,
              `✅ 新用户通过验证\n\n` +
              `👤 用户: ${username}\n` +
              `🆔 ID: ${userId}\n` +
              `⏰ 时间: ${new Date().toLocaleString('zh-CN')}`
            );
          } else {
            // 验证失败
            if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
              await this.bot.sendMessage(
                chatId,
                `❌ ${result.message}\n\n请重新输入验证码：`
              );
            } else {
              // 没有剩余机会或验证码过期
              await this.bot.sendMessage(
                chatId,
                `❌ ${result.message}`
              );
            }
          }
        } else {
          // 用户还没有开始验证，提示他们发送 /start
          await this.bot.sendMessage(
            chatId,
            '⚠️ 请先发送 /start 命令开始验证。'
          );
        }
        return;
      }

      // 用户已验证，转发消息给主人
      await this.forwardToOwner(msg, username);

    } catch (error) {
      logger.error('处理文本消息失败', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 处理图片消息
   */
  async handlePhotoMessage(msg) {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name || '未知用户';

      logger.info('收到图片消息', {
        userId,
        username
      });

      // 如果是主人发送的消息，不处理
      if (userId === this.ownerId) {
        // 检查是否是回复消息
        if (msg.reply_to_message) {
          await this.handleOwnerReply(msg);
        } else {
          logger.debug('主人发送的普通图片，跳过处理');
        }
        return;
      }

      // 检查用户是否被拉黑
      if (await this.db.isUserBlocked(userId)) {
        logger.info('拉黑用户尝试发送图片', { userId, username });
        await this.bot.sendMessage(
          chatId,
          '❌ 抱歉，您已被拉黑，无法发送消息。'
        );
        return;
      }

      // 检查用户是否已验证
      if (!await userVerification.isVerified(userId)) {
        await this.bot.sendMessage(
          chatId,
          '⚠️ 请先完成验证才能发送图片。\n发送 /start 开始验证。'
        );
        return;
      }

      // 用户已验证，转发图片给主人
      await this.forwardPhotoToOwner(msg, username);

    } catch (error) {
      logger.error('处理图片消息失败', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 处理 /start 命令
   */
  async handleStartCommand(msg) {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name || '未知用户';

      logger.info('/start 命令', {
        userId,
        username
      });

      if (userId === this.ownerId) {
        // 主人的欢迎消息
        const stats = await userVerification.getStats();
        await this.bot.sendMessage(
          chatId,
          '👋 欢迎主人！\n\n' +
          '🤖 机器人状态: 运行中\n' +
          `👥 已验证用户: ${stats.verifiedUsers}\n` +
          `⏳ 待验证用户: ${stats.pendingVerifications}\n` +
          `❌ 验证失败记录: ${stats.failedVerifications}\n` +
          `🚫 拉黑用户: ${stats.blockedUsers}\n\n` +
          '新用户需要通过验证码验证才能向您发送消息。'
        );
      } else {
        // 检查用户是否被拉黑
        if (await this.db.isUserBlocked(userId)) {
          const failCount = await this.db.getFailedVerificationCount(userId);
          if (failCount > 0) {
            await this.bot.sendMessage(
              chatId,
              '❌ 您因多次验证失败已被禁止使用此机器人。\n\n' +
              '如有疑问，请联系管理员。'
            );
          } else {
            await this.bot.sendMessage(
              chatId,
              '❌ 抱歉，您已被拉黑，无法使用此机器人。'
            );
          }
          return;
        }

        // 检查用户是否已经验证
        if (await userVerification.isVerified(userId)) {
          await this.bot.sendMessage(
            chatId,
            '👋 欢迎回来！\n\n' +
            '你已经通过验证，可以直接向我发送消息或图片。'
          );
        } else {
          // 未验证用户，发送验证码
          await this.sendCaptchaToUser(chatId, userId, username);
        }
      }

    } catch (error) {
      logger.error('处理 /start 命令失败', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 向用户发送验证码
   */
  async sendCaptchaToUser(chatId, userId, username) {
    try {
      // 生成验证码
      const captchaSvg = await userVerification.createVerificationForUser(userId);

      // 将 SVG 转换为 PNG
      const pngBuffer = await sharp(Buffer.from(captchaSvg))
        .png()
        .toBuffer();

      // 发送欢迎消息
      await this.bot.sendMessage(
        chatId,
        '👋 你好！\n\n' +
        '🔐 为了防止垃圾消息，请先完成验证。\n\n' +
        '我会发送一张验证码图片给你，请回复图片中的字符（不区分大小写）。\n\n' +
        '⚠️ 注意：\n' +
        '- 验证码有效期 5 分钟\n' +
        '- 最多可尝试 3 次\n' +
        '- 如验证码过期或失败，请重新发送 /start'
      );

      // 发送验证码图片
      await this.bot.sendPhoto(chatId, pngBuffer, {
        caption: '📷 请回复图片中的验证码：'
      });

      // 通知主人有新用户开始验证
      await this.bot.sendMessage(
        this.ownerId,
        `🆕 新用户开始验证\n\n` +
        `� 用户: ${username}\n` +
        `🆔 ID: ${userId}\n` +
        `⏰ 时间: ${new Date().toLocaleString('zh-CN')}`
      );

      logger.info('验证码已发送给用户', { userId, username });

    } catch (error) {
      logger.error('发送验证码失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        chatId,
        '❌ 验证码发送失败，请稍后重试或联系管理员。'
      );
    }
  }

  /**
   * 转发消息给主人
   */
  async forwardToOwner(msg, username) {
    try {
      // 发送用户信息
      const userInfo = `📨 新消息来自: ${username}\n` +
                      `🆔 用户ID: ${msg.from.id}\n` +
                      `⏰ 时间: ${new Date().toLocaleString('zh-CN')}\n` +
                      `💡 回复此消息可直接回复用户\n` +
                      `${'─'.repeat(30)}`;

      await this.bot.sendMessage(this.ownerId, userInfo);

      // 转发原始消息，并记录消息ID
      const forwardedMsg = await this.bot.forwardMessage(
        this.ownerId,
        msg.chat.id,
        msg.message_id
      );
      
      // 保存消息映射到数据库
      await this.db.saveMessageMapping(forwardedMsg.message_id, msg.from.id, username);

      // 向用户确认
      await this.bot.sendMessage(
        msg.chat.id,
        '✅ 您的消息已成功发送！'
      );

      logger.info('消息已转发给主人', {
        userId: msg.from.id,
        username,
        forwardedMessageId: forwardedMsg.message_id
      });

    } catch (error) {
      logger.error('转发消息失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        msg.chat.id,
        '❌ 消息发送失败，请稍后重试。'
      );
    }
  }

  /**
   * 转发图片给主人
   */
  async forwardPhotoToOwner(msg, username) {
    try {
      // 发送用户信息
      const userInfo = `📷 新图片来自: ${username}\n` +
                      `🆔 用户ID: ${msg.from.id}\n` +
                      `⏰ 时间: ${new Date().toLocaleString('zh-CN')}\n` +
                      `💡 回复此消息可直接回复用户\n` +
                      `${'─'.repeat(30)}`;

      await this.bot.sendMessage(this.ownerId, userInfo);

      // 转发图片，并记录消息ID
      const forwardedMsg = await this.bot.forwardMessage(
        this.ownerId,
        msg.chat.id,
        msg.message_id
      );
      
      // 保存消息映射到数据库
      await this.db.saveMessageMapping(forwardedMsg.message_id, msg.from.id, username);

      // 向用户确认
      await this.bot.sendMessage(
        msg.chat.id,
        '✅ 您的图片已成功发送！'
      );

      logger.info('图片已转发给主人', {
        userId: msg.from.id,
        username,
        forwardedMessageId: forwardedMsg.message_id
      });

    } catch (error) {
      logger.error('转发图片失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        msg.chat.id,
        '❌ 图片发送失败，请稍后重试。'
      );
    }
  }

  /**
   * 处理主人的回复消息
   */
  async handleOwnerReply(msg) {
    try {
      const replyToMsgId = msg.reply_to_message.message_id;
      
      // 添加调试日志
      logger.info('处理主人回复', {
        replyToMsgId,
        hasText: !!msg.text,
        text: msg.text,
        textLower: msg.text ? msg.text.trim().toLowerCase() : null
      });
      
      // 检查是否是拉黑命令
      if (msg.text && msg.text.trim().toLowerCase() === '/block') {
        logger.info('检测到拉黑命令');
        await this.handleBlockUser(msg);
        return;
      }

      // 检查是否是解除拉黑命令
      if (msg.text && msg.text.trim().toLowerCase() === '/unblock') {
        logger.info('检测到解除拉黑命令');
        await this.handleUnblockUser(msg);
        return;
      }

      logger.info('处理正常回复消息');
      
      // 从数据库查找原始用户ID
      const mapping = await this.db.getMessageMapping(replyToMsgId);
      
      if (!mapping) {
        await this.bot.sendMessage(
          this.ownerId,
          '❌ 无法找到要回复的用户。可能原因：\n' +
          '• 消息映射已过期（超过7天）\n' +
          '• 这不是一条用户转发的消息\n\n' +
          '💡 提示：只能回复7天内转发的用户消息。'
        );
        logger.warn('找不到消息映射', { replyToMsgId });
        return;
      }

      const targetUserId = mapping.userId;
      const username = mapping.username || '用户';

      // 发送回复给用户
      if (msg.photo) {
        // 如果是图片回复
        const photo = msg.photo[msg.photo.length - 1]; // 获取最大尺寸的图片
        await this.bot.sendPhoto(targetUserId, photo.file_id, {
          caption: `💬 主人回复：\n\n${msg.caption || '（图片）'}`
        });
      } else if (msg.text) {
        // 如果是文字回复
        await this.bot.sendMessage(
          targetUserId,
          `💬 主人回复：\n\n${msg.text}`
        );
      } else {
        // 其他类型暂不支持
        await this.bot.sendMessage(
          this.ownerId,
          '⚠️ 暂不支持此类型的回复，请发送文字或图片。'
        );
        return;
      }

      // 确认发送成功
      await this.bot.sendMessage(
        this.ownerId,
        `✅ 回复已发送给用户 ${username} (ID: ${targetUserId})`
      );

      logger.info('主人回复已发送', {
        targetUserId,
        username,
        hasPhoto: !!msg.photo,
        hasText: !!msg.text
      });

    } catch (error) {
      logger.error('处理主人回复失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        this.ownerId,
        '❌ 回复发送失败，请稍后重试。'
      );
    }
  }

  /**
   * 处理拉黑用户
   */
  async handleBlockUser(msg) {
    try {
      const replyToMsgId = msg.reply_to_message.message_id;
      
      // 从数据库查找原始用户ID
      const mapping = await this.db.getMessageMapping(replyToMsgId);
      
      if (!mapping) {
        await this.bot.sendMessage(
          this.ownerId,
          '❌ 无法找到要拉黑的用户，可能是消息映射已过期。'
        );
        return;
      }

      const targetUserId = mapping.userId;
      const username = mapping.username || '用户';

      // 添加到黑名单
      await this.db.blockUser(targetUserId);

      // 确认拉黑成功
      await this.bot.sendMessage(
        this.ownerId,
        `✅ 已拉黑用户 ${username} (ID: ${targetUserId})\n\n` +
        `该用户将无法再发送消息给您。\n\n` +
        `💡 如需解除拉黑，请回复该用户的消息并发送 /unblock`
      );

      logger.info('用户已被拉黑', {
        targetUserId,
        username,
        byOwner: this.ownerId
      });

    } catch (error) {
      logger.error('拉黑用户失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        this.ownerId,
        '❌ 拉黑用户失败，请稍后重试。'
      );
    }
  }

  /**
   * 通过用户ID直接拉黑用户
   */
  async handleBlockUserById(msg, targetUserId) {
    try {
      const userId = parseInt(targetUserId);
      
      // 检查是否要拉黑自己
      if (userId === this.ownerId) {
        await this.bot.sendMessage(
          this.ownerId,
          '❌ 您不能拉黑自己。'
        );
        return;
      }

      // 检查用户是否已经被拉黑
      if (await this.db.isUserBlocked(userId)) {
        await this.bot.sendMessage(
          this.ownerId,
          `ℹ️ 用户 (ID: ${userId}) 已经在黑名单中。`
        );
        return;
      }

      // 添加到黑名单
      await this.db.blockUser(userId);

      // 确认拉黑成功
      await this.bot.sendMessage(
        this.ownerId,
        `✅ 已拉黑用户 (ID: ${userId})\n\n` +
        `该用户将无法再发送消息给您。\n\n` +
        `💡 如需解除拉黑，请发送 /unblock ${userId}`
      );

      logger.info('用户已被拉黑（通过ID）', {
        targetUserId: userId,
        byOwner: this.ownerId
      });

    } catch (error) {
      logger.error('拉黑用户失败（通过ID）', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        this.ownerId,
        '❌ 拉黑用户失败，请检查用户ID是否正确。'
      );
    }
  }

  /**
   * 处理解除拉黑用户
   */
  async handleUnblockUser(msg) {
    try {
      const replyToMsgId = msg.reply_to_message.message_id;
      
      // 从数据库查找原始用户ID
      const mapping = await this.db.getMessageMapping(replyToMsgId);
      
      if (!mapping) {
        await this.bot.sendMessage(
          this.ownerId,
          '❌ 无法找到要解除拉黑的用户，可能是消息映射已过期。'
        );
        return;
      }

      const targetUserId = mapping.userId;
      const username = mapping.username || '用户';

      // 检查用户是否被拉黑
      if (!await this.db.isUserBlocked(targetUserId)) {
        await this.bot.sendMessage(
          this.ownerId,
          `ℹ️ 用户 ${username} (ID: ${targetUserId}) 未被拉黑。`
        );
        return;
      }

      // 从黑名单移除
      await this.db.unblockUser(targetUserId);

      // 清除验证失败记录（如果有）
      await this.db.clearFailedVerifications(targetUserId);

      // 确认解除拉黑成功
      await this.bot.sendMessage(
        this.ownerId,
        `✅ 已解除拉黑用户 ${username} (ID: ${targetUserId})\n\n` +
        `该用户现在可以正常发送消息了。\n` +
        `验证失败记录已清除。`
      );

      logger.info('用户已解除拉黑', {
        targetUserId,
        username,
        byOwner: this.ownerId
      });

    } catch (error) {
      logger.error('解除拉黑用户失败', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        this.ownerId,
        '❌ 解除拉黑用户失败，请稍后重试。'
      );
    }
  }

  /**
   * 通过用户ID直接解除拉黑
   */
  async handleUnblockUserById(msg, targetUserId) {
    try {
      const userId = parseInt(targetUserId);

      // 检查用户是否被拉黑
      if (!await this.db.isUserBlocked(userId)) {
        await this.bot.sendMessage(
          this.ownerId,
          `ℹ️ 用户 (ID: ${userId}) 未被拉黑。`
        );
        return;
      }

      // 从黑名单移除
      await this.db.unblockUser(userId);

      // 清除验证失败记录（如果有）
      await this.db.clearFailedVerifications(userId);

      // 确认解除拉黑成功
      await this.bot.sendMessage(
        this.ownerId,
        `✅ 已解除拉黑用户 (ID: ${userId})\n\n` +
        `该用户现在可以正常发送消息了。\n` +
        `验证失败记录已清除。`
      );

      logger.info('用户已解除拉黑（通过ID）', {
        targetUserId: userId,
        byOwner: this.ownerId
      });

    } catch (error) {
      logger.error('解除拉黑用户失败（通过ID）', {
        error: error.message,
        stack: error.stack
      });

      await this.bot.sendMessage(
        this.ownerId,
        '❌ 解除拉黑用户失败，请检查用户ID是否正确。'
      );
    }
  }

  /**
   * 处理错误
   */
  handleError(error) {
    logger.error('Bot 错误', {
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = MessageHandler;

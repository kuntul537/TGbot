const supabase = require('./supabaseClient');
const logger = require('./logger');

/**
 * Supabase 数据库管理器
 * 使用 Supabase 云数据库存储所有数据
 */
class SupabaseDatabase {
  constructor() {
    this.initialized = false;
  }

  /**
   * 初始化数据库（创建表）
   */
  async initialize() {
    try {
      logger.info('✅ Supabase 数据库管理器初始化完成');
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error(`❌ 数据库初始化失败 | ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * 保存消息映射
   */
  async saveMessageMapping(forwardedMessageId, userId, username) {
    try {
      const { data, error } = await supabase
        .from('message_mappings')
        .upsert({
          forwarded_message_id: forwardedMessageId,
          user_id: userId,
          username: username,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'forwarded_message_id'
        });

      if (error) throw error;

      logger.debug(`💾 消息映射已保存 | 转发消息ID: ${forwardedMessageId} | 用户: ${username} (${userId})`);
      return true;
    } catch (error) {
      logger.error(`❌ 保存消息映射失败 | ${error.message}`, { stack: error.stack });
      return false;
    }
  }

  /**
   * 获取消息映射
   */
  async getMessageMapping(forwardedMessageId) {
    try {
      const { data, error } = await supabase
        .from('message_mappings')
        .select('*')
        .eq('forwarded_message_id', forwardedMessageId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录
          return null;
        }
        throw error;
      }

      return {
        userId: data.user_id,
        username: data.username,
        createdAt: data.created_at
      };
    } catch (error) {
      logger.error(`❌ 获取消息映射失败 | 消息ID: ${forwardedMessageId} | ${error.message}`);
      return null;
    }
  }

  /**
   * 保存已验证用户
   */
  async saveVerifiedUser(userId, username) {
    try {
      const { data, error } = await supabase
        .from('verified_users')
        .upsert({
          user_id: userId,
          username: username,
          verified_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      logger.info(`✅ 用户验证状态已保存 | 用户: ${username} (${userId})`);
      return true;
    } catch (error) {
      logger.error(`❌ 保存用户验证状态失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 检查用户是否已验证
   */
  async isUserVerified(userId) {
    try {
      const { data, error } = await supabase
        .from('verified_users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error(`❌ 检查用户验证状态失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 保存待验证的验证码
   */
  async savePendingVerification(userId, code, attempts = 0) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5分钟后过期

      const { data, error } = await supabase
        .from('pending_verifications')
        .upsert({
          user_id: userId,
          code: code,
          attempts: attempts,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      logger.debug(`💾 待验证信息已保存 | 用户ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`❌ 保存待验证信息失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 获取待验证的验证码
   */
  async getPendingVerification(userId) {
    try {
      const { data, error } = await supabase
        .from('pending_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // 检查是否过期
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        await this.deletePendingVerification(userId);
        return null;
      }

      return {
        code: data.code,
        attempts: data.attempts,
        expiresAt: data.expires_at
      };
    } catch (error) {
      logger.error(`❌ 获取待验证信息失败 | 用户ID: ${userId} | ${error.message}`);
      return null;
    }
  }

  /**
   * 删除待验证信息
   */
  async deletePendingVerification(userId) {
    try {
      const { error } = await supabase
        .from('pending_verifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error(`❌ 删除待验证信息失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 增加验证尝试次数
   */
  async incrementVerificationAttempts(userId) {
    try {
      const verification = await this.getPendingVerification(userId);
      if (!verification) return false;

      const newAttempts = verification.attempts + 1;

      const { error } = await supabase
        .from('pending_verifications')
        .update({ attempts: newAttempts })
        .eq('user_id', userId);

      if (error) throw error;

      return newAttempts;
    } catch (error) {
      logger.error(`❌ 增加验证尝试次数失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 清理过期的验证码
   */
  async cleanupExpiredVerifications() {
    try {
      const { error } = await supabase
        .from('pending_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      logger.info(`🧹 已清理过期验证码`);
      return true;
    } catch (error) {
      logger.error(`❌ 清理过期验证码失败 | ${error.message}`);
      return false;
    }
  }

  /**
   * 拉黑用户
   */
  async blockUser(userId) {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .upsert({
          user_id: userId,
          blocked_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      logger.info(`🚫 用户已加入黑名单 | 用户ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`❌ 拉黑用户失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 解除拉黑
   */
  async unblockUser(userId) {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      logger.info(`✅ 用户已从黑名单移除 | 用户ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`❌ 解除拉黑失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 检查用户是否被拉黑
   */
  async isUserBlocked(userId) {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error(`❌ 检查用户黑名单状态失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 获取黑名单用户数量
   */
  async getBlockedUserCount() {
    try {
      const { count, error } = await supabase
        .from('blocked_users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error(`❌ 获取黑名单用户数量失败 | ${error.message}`);
      return 0;
    }
  }

  /**
   * 记录验证失败
   */
  async recordFailedVerification(userId, username, reason) {
    try {
      const { error } = await supabase
        .from('failed_verifications')
        .insert({
          user_id: userId,
          username: username,
          reason: reason,
          failed_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.warn(`⚠️ 已记录验证失败 | 用户: ${username} (${userId}) | 原因: ${reason}`);
      return true;
    } catch (error) {
      logger.error(`❌ 记录验证失败失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 获取用户验证失败次数
   */
  async getFailedVerificationCount(userId) {
    try {
      const { count, error } = await supabase
        .from('failed_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error(`❌ 获取验证失败次数失败 | 用户ID: ${userId} | ${error.message}`);
      return 0;
    }
  }

  /**
   * 检查用户是否因验证失败被拉黑
   */
  async isUserFailedVerification(userId) {
    try {
      const { data, error } = await supabase
        .from('failed_verifications')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      logger.error(`❌ 检查验证失败记录失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 清除用户的验证失败记录
   */
  async clearFailedVerifications(userId) {
    try {
      const { error } = await supabase
        .from('failed_verifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      logger.info(`🧹 已清除用户验证失败记录 | 用户ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`❌ 清除验证失败记录失败 | 用户ID: ${userId} | ${error.message}`);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const { count: verifiedCount } = await supabase
        .from('verified_users')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('pending_verifications')
        .select('*', { count: 'exact', head: true });

      const { count: blockedCount } = await supabase
        .from('blocked_users')
        .select('*', { count: 'exact', head: true });

      const { count: mappingsCount } = await supabase
        .from('message_mappings')
        .select('*', { count: 'exact', head: true });

      const { count: failedCount } = await supabase
        .from('failed_verifications')
        .select('*', { count: 'exact', head: true });

      return {
        verifiedUsers: verifiedCount || 0,
        pendingVerifications: pendingCount || 0,
        blockedUsers: blockedCount || 0,
        messageMappings: mappingsCount || 0,
        failedVerifications: failedCount || 0
      };
    } catch (error) {
      logger.error(`❌ 获取统计信息失败 | ${error.message}`);
      return {
        verifiedUsers: 0,
        pendingVerifications: 0,
        blockedUsers: 0,
        messageMappings: 0,
        failedVerifications: 0
      };
    }
  }

  /**
   * 启动定期清理任务
   */
  startCleanupTask() {
    // 每小时清理一次过期验证码
    setInterval(async () => {
      await this.cleanupExpiredVerifications();
    }, 60 * 60 * 1000); // 1小时

    logger.info('⏰ 定期清理任务已启动 (每小时清理过期验证码)');
  }
}

// 导出单例
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new SupabaseDatabase();
    }
    return instance;
  }
};

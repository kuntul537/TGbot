-- Telegram Bot 数据库表结构
-- 请在 Supabase SQL Editor 中执行这些语句

-- 1. 消息映射表
CREATE TABLE IF NOT EXISTS message_mappings (
  id BIGSERIAL PRIMARY KEY,
  forwarded_message_id BIGINT UNIQUE NOT NULL,
  user_id BIGINT NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用行级安全策略（因为是后端服务直接访问）
ALTER TABLE message_mappings DISABLE ROW LEVEL SECURITY;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_message_mappings_forwarded_id ON message_mappings(forwarded_message_id);
CREATE INDEX IF NOT EXISTS idx_message_mappings_created_at ON message_mappings(created_at);

-- 2. 已验证用户表
CREATE TABLE IF NOT EXISTS verified_users (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用行级安全策略
ALTER TABLE verified_users DISABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_verified_users_user_id ON verified_users(user_id);

-- 3. 待验证用户表
CREATE TABLE IF NOT EXISTS pending_verifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用行级安全策略
ALTER TABLE pending_verifications DISABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pending_verifications_user_id ON pending_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_verifications_expires_at ON pending_verifications(expires_at);

-- 4. 拉黑用户表
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用行级安全策略
ALTER TABLE blocked_users DISABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);

-- 5. 验证失败记录表
CREATE TABLE IF NOT EXISTS failed_verifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  reason TEXT,
  failed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用行级安全策略
ALTER TABLE failed_verifications DISABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_failed_verifications_user_id ON failed_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_verifications_failed_at ON failed_verifications(failed_at);

-- 添加注释
COMMENT ON TABLE message_mappings IS '消息映射表：存储转发消息和原始用户的映射关系';
COMMENT ON TABLE verified_users IS '已验证用户表：存储通过验证码验证的用户';
COMMENT ON TABLE pending_verifications IS '待验证表：存储待验证的用户和验证码';
COMMENT ON TABLE blocked_users IS '黑名单表：存储被拉黑的用户';
COMMENT ON TABLE failed_verifications IS '验证失败记录表：存储验证未通过的用户';

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少 Supabase 配置：请在 .env 文件中设置 SUPABASE_URL 和 SUPABASE_KEY');
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

logger.info('Supabase 客户端已初始化');

module.exports = supabase;

require('dotenv').config();

/**
 * 配置检查工具
 * 用于验证配置是否正确
 */

console.log('======================================');
console.log('  Telegram Bot 配置检查工具');
console.log('======================================\n');

let hasError = false;

// 检查 BOT_TOKEN
console.log('📋 检查 BOT_TOKEN...');
if (!process.env.BOT_TOKEN) {
  console.log('❌ 未设置 BOT_TOKEN');
  console.log('   请在 .env 文件中设置 BOT_TOKEN\n');
  hasError = true;
} else if (process.env.BOT_TOKEN === 'your_bot_token_here') {
  console.log('⚠️  BOT_TOKEN 未修改');
  console.log('   请在 .env 文件中填写真实的 Bot Token\n');
  hasError = true;
} else {
  const token = process.env.BOT_TOKEN;
  const tokenPrefix = token.substring(0, 10);
  const tokenSuffix = token.substring(token.length - 5);
  console.log(`✅ BOT_TOKEN 已设置: ${tokenPrefix}...${tokenSuffix}\n`);
}

// 检查 OWNER_ID
console.log('📋 检查 OWNER_ID...');
if (!process.env.OWNER_ID) {
  console.log('❌ 未设置 OWNER_ID');
  console.log('   请在 .env 文件中设置 OWNER_ID\n');
  hasError = true;
} else if (process.env.OWNER_ID === 'your_owner_id_here') {
  console.log('⚠️  OWNER_ID 未修改');
  console.log('   请在 .env 文件中填写真实的用户 ID\n');
  hasError = true;
} else if (isNaN(parseInt(process.env.OWNER_ID))) {
  console.log('❌ OWNER_ID 格式错误');
  console.log('   OWNER_ID 必须是数字\n');
  hasError = true;
} else {
  console.log(`✅ OWNER_ID 已设置: ${process.env.OWNER_ID}\n`);
}

// 检查 LOG_LEVEL
console.log('📋 检查 LOG_LEVEL...');
const validLevels = ['debug', 'info', 'warn', 'error'];
const logLevel = process.env.LOG_LEVEL || 'info';
if (validLevels.includes(logLevel)) {
  console.log(`✅ LOG_LEVEL: ${logLevel}\n`);
} else {
  console.log(`⚠️  无效的 LOG_LEVEL: ${logLevel}`);
  console.log(`   有效值: ${validLevels.join(', ')}`);
  console.log('   将使用默认值: info\n');
}

// 检查依赖
console.log('📋 检查依赖包...');
try {
  require('node-telegram-bot-api');
  console.log('✅ node-telegram-bot-api 已安装\n');
} catch (error) {
  console.log('❌ node-telegram-bot-api 未安装');
  console.log('   请运行: npm install\n');
  hasError = true;
}

// 总结
console.log('======================================');
if (hasError) {
  console.log('❌ 配置检查失败');
  console.log('   请根据上述提示修正配置后重试');
  console.log('======================================\n');
  process.exit(1);
} else {
  console.log('✅ 配置检查通过！');
  console.log('   可以运行: npm start 启动机器人');
  console.log('======================================\n');
  
  // 显示帮助信息
  console.log('💡 使用提示：');
  console.log('1. 在 Telegram 中搜索你的机器人');
  console.log('2. 发送 /start 命令激活机器人');
  console.log('3. 其他用户向机器人发送消息时会转发给你');
  console.log('4. 广告消息会被自动过滤\n');
  
  console.log('📚 获取 Token 和 ID：');
  console.log('- Bot Token: https://t.me/BotFather');
  console.log('- User ID: https://t.me/userinfobot\n');
}

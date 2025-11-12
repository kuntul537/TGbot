const config = require('./config');

/**
 * 日志级别
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * 日志工具类
 */
class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.getLogLevel()] || LOG_LEVELS.info;
  }

  /**
   * 格式化时间
   */
  getTimestamp() {
    return new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }
    
    return logMessage;
  }

  /**
   * Debug 级别日志
   */
  debug(message, data = null) {
    if (this.level <= LOG_LEVELS.debug) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  /**
   * Info 级别日志
   */
  info(message, data = null) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  /**
   * Warn 级别日志
   */
  warn(message, data = null) {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  /**
   * Error 级别日志
   */
  error(message, data = null) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(this.formatMessage('error', message, data));
    }
  }
}

module.exports = new Logger();

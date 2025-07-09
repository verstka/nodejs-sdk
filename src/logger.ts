/**
 * Logging utilities for Verstka SDK
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Enable debug logging */
  debug: boolean;
  /** Optional prefix for all log messages */
  prefix?: string;
}

/**
 * Logger class for Verstka SDK
 */
export class VerstkaLogger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(...args: any[]): void {
    if (this.config.debug) {
      this.log('debug', ...args);
    }
  }

  /**
   * Log info message (always shown)
   */
  info(...args: any[]): void {
    this.log('info', ...args);
  }

  /**
   * Log warning message (always shown)
   */
  warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  /**
   * Log error message (always shown)
   */
  error(...args: any[]): void {
    this.log('error', ...args);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, ...args: any[]): void {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    
    switch (level) {
      case 'debug':
        console.log(prefix, '🔍', ...args);
        break;
      case 'info':
        console.log(prefix, '📝', ...args);
        break;
      case 'warn':
        console.warn(prefix, '⚠️ ', ...args);
        break;
      case 'error':
        console.error(prefix, '❌', ...args);
        break;
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig): VerstkaLogger {
  return new VerstkaLogger(config);
} 
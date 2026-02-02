/**
 * Simple logger utility for FeishuPilot
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  let output = `[${timestamp}] ${levelStr} ${message}`;
  if (meta !== undefined) {
    output += ` ${JSON.stringify(meta)}`;
  }
  return output;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: unknown): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: unknown): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error(message: string, meta?: unknown): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};

export function createLogger(prefix: string) {
  return {
    debug(message: string, meta?: unknown): void {
      logger.debug(`[${prefix}] ${message}`, meta);
    },
    info(message: string, meta?: unknown): void {
      logger.info(`[${prefix}] ${message}`, meta);
    },
    warn(message: string, meta?: unknown): void {
      logger.warn(`[${prefix}] ${message}`, meta);
    },
    error(message: string, meta?: unknown): void {
      logger.error(`[${prefix}] ${message}`, meta);
    },
  };
}

export class Logger {
  static get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static debug(tag: string, message: string, ...args: any[]) {
    if (!this.isProduction) {
      console.log(`[DEBUG] [${tag}] ${message}`, ...args);
    }
  }

  static info(tag: string, message: string, ...args: any[]) {
    if (!this.isProduction) {
      console.info(`[INFO] [${tag}] ${message}`, ...args);
    }
  }

  static warning(tag: string, message: string, ...args: any[]) {
    if (!this.isProduction) {
      console.warn(`[WARNING] [${tag}] ${message}`, ...args);
    }
  }

  static error(tag: string, message: string, error?: any, ...args: any[]) {
    if (!this.isProduction) {
      console.error(`[ERROR] [${tag}] ${message}`, error, ...args);
    }
  }
}

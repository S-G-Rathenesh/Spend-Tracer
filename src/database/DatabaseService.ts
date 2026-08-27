import SQLite from 'react-native-sqlite-storage';
import { Migration } from './Migration';
import { Logger } from '../utils/Logger';
import { TransactionRepository } from '../repositories/TransactionRepository';

SQLite.enablePromise(true);

export class DatabaseService {
  private static instance: SQLite.SQLiteDatabase | null = null;

  static async initDB(): Promise<SQLite.SQLiteDatabase> {
    if (this.instance) return this.instance;

    try {
      this.instance = await SQLite.openDatabase({
        name: 'SpendGuardDB_v3.db',
        location: 'default'
      });
      Logger.info('DatabaseService', 'Database opened successfully');
      
      await Migration.run(this.instance);
      Logger.info('DatabaseService', 'Database migrations applied successfully');

      // Cleanup historical transactions (failed and informational false positives)
      await TransactionRepository.cleanupHistoricalFailedTransactions();
      await TransactionRepository.cleanupHistoricalInformationalTransactions();
      Logger.info('DatabaseService', 'Historical transactions cleanup completed');
      
      return this.instance;
    } catch (error) {
      Logger.error('DatabaseService', 'Database initialization failed', error);
      throw error;
    }
  }

  static getDB(): SQLite.SQLiteDatabase {
    if (!this.instance) {
      throw new Error('Database not initialized. Call initDB() first.');
    }
    return this.instance;
  }
}

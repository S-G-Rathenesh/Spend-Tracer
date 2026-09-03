import SQLite from 'react-native-sqlite-storage';
import { Schema, Indexes } from './Schema';
import { Seed } from './Seed';

export class Migration {
  private static async executeSqlSafe(db: SQLite.SQLiteDatabase, sql: string, params: any[] = []): Promise<any> {
    try {
      const [result] = await db.executeSql(sql, params);
      return result;
    } catch (e) {
      // Ignore column already exists, duplicate index, etc.
      return null;
    }
  }

  static async run(db: SQLite.SQLiteDatabase): Promise<void> {
    // 1. Create Base Tables
    await this.executeSqlSafe(db, Schema.users);
    await this.executeSqlSafe(db, Schema.categories);
    await this.executeSqlSafe(db, Schema.merchantCache);
    await this.executeSqlSafe(db, Schema.transactions);
    await this.executeSqlSafe(db, Schema.scamHistory);
    await this.executeSqlSafe(db, Schema.settings);
    await this.executeSqlSafe(db, Schema.incomingSMS);
    await this.executeSqlSafe(db, Schema.merchantCategoryMapping);

    // 2. Migrate Transactions columns
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN needsVerification INTEGER DEFAULT 0');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN sources TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN smsHash TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN originalSms TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN aiCategory TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN aiConfidence REAL');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN userCategory TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE Transactions ADD COLUMN finalCategory TEXT');
    await this.executeSqlSafe(db, "ALTER TABLE Transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED'");

    // 3. Migrate IncomingSMS columns
    await this.executeSqlSafe(db, 'ALTER TABLE IncomingSMS ADD COLUMN predictedClass TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE IncomingSMS ADD COLUMN confidence REAL');
    await this.executeSqlSafe(db, 'ALTER TABLE IncomingSMS ADD COLUMN reasons TEXT');

    // 4. Migrate MerchantCategoryMapping columns
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN sms_hash TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN sender TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN upi_id TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN account_identifier TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN mapping_type TEXT');
    await this.executeSqlSafe(db, 'ALTER TABLE MerchantCategoryMapping ADD COLUMN confidence REAL DEFAULT 1.0');


    // 5. Create Indexes
    for (const indexSql of Indexes) {
      await this.executeSqlSafe(db, indexSql);
    }

    // 6. Ensure all seed categories (including Friend, Cashback, EMI, Transfer) exist
    for (const category of Seed.categories) {
      await this.executeSqlSafe(
        db,
        'INSERT OR IGNORE INTO Categories (id, name, icon, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [category.id, category.name, category.icon, category.color, new Date().toISOString(), new Date().toISOString()]
      );
    }
  }
}

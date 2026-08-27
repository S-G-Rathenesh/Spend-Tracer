import SQLite from 'react-native-sqlite-storage';
import { Schema, Indexes } from './Schema';
import { Seed } from './Seed';

export class Migration {
  static async run(db: SQLite.SQLiteDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          // Create Tables
          tx.executeSql(Schema.users);
          tx.executeSql(Schema.categories);
          tx.executeSql(Schema.merchantCache);
          tx.executeSql(Schema.transactions);
          tx.executeSql(Schema.scamHistory);
          tx.executeSql(Schema.settings);
          tx.executeSql(Schema.incomingSMS);
          tx.executeSql(Schema.merchantCategoryMapping);

          // Add needsVerification, sources, smsHash column to Transactions if it doesn't exist
          tx.executeSql('PRAGMA table_info(Transactions)', [], (_, result) => {
            let hasNeedsVerification = false;
            let hasSources = false;
            let hasSmsHash = false;
            let hasOriginalSms = false;
            let hasAiCategory = false;
            let hasAiConfidence = false;
            let hasUserCategory = false;
            let hasFinalCategory = false;
            let hasStatus = false;
            
            for (let i = 0; i < result.rows.length; i++) {
              const colName = result.rows.item(i).name;
              if (colName === 'needsVerification') hasNeedsVerification = true;
              if (colName === 'sources') hasSources = true;
              if (colName === 'smsHash') hasSmsHash = true;
              if (colName === 'originalSms') hasOriginalSms = true;
              if (colName === 'aiCategory') hasAiCategory = true;
              if (colName === 'aiConfidence') hasAiConfidence = true;
              if (colName === 'userCategory') hasUserCategory = true;
              if (colName === 'finalCategory') hasFinalCategory = true;
              if (colName === 'status') hasStatus = true;
            }
            if (!hasNeedsVerification) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN needsVerification INTEGER DEFAULT 0');
            }
            if (!hasSources) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN sources TEXT');
            }
            if (!hasSmsHash) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN smsHash TEXT');
            }
            if (!hasOriginalSms) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN originalSms TEXT');
            }
            if (!hasAiCategory) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN aiCategory TEXT');
            }
            if (!hasAiConfidence) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN aiConfidence REAL');
            }
            if (!hasUserCategory) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN userCategory TEXT');
            }
            if (!hasFinalCategory) {
              tx.executeSql('ALTER TABLE Transactions ADD COLUMN finalCategory TEXT');
            }
            if (!hasStatus) {
              tx.executeSql("ALTER TABLE Transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED'");
            }
          });

          // Add classification columns to IncomingSMS if it doesn't exist
          tx.executeSql('PRAGMA table_info(IncomingSMS)', [], (_, result) => {
            let hasPredictedClass = false;
            let hasConfidence = false;
            let hasReasons = false;
            for (let i = 0; i < result.rows.length; i++) {
              const colName = result.rows.item(i).name;
              if (colName === 'predictedClass') hasPredictedClass = true;
              if (colName === 'confidence') hasConfidence = true;
              if (colName === 'reasons') hasReasons = true;
            }
            if (!hasPredictedClass) {
              tx.executeSql('ALTER TABLE IncomingSMS ADD COLUMN predictedClass TEXT');
            }
            if (!hasConfidence) {
              tx.executeSql('ALTER TABLE IncomingSMS ADD COLUMN confidence REAL');
            }
            if (!hasReasons) {
              tx.executeSql('ALTER TABLE IncomingSMS ADD COLUMN reasons TEXT');
            }
          });

          // Add sms_hash and sender columns to MerchantCategoryMapping if they don't exist
          tx.executeSql('PRAGMA table_info(MerchantCategoryMapping)', [], (_, result) => {
            let hasSmsHash = false;
            let hasSender = false;
            for (let i = 0; i < result.rows.length; i++) {
              const colName = result.rows.item(i).name;
              if (colName === 'sms_hash') hasSmsHash = true;
              if (colName === 'sender') hasSender = true;
            }
            if (!hasSmsHash) {
              tx.executeSql('ALTER TABLE MerchantCategoryMapping ADD COLUMN sms_hash TEXT');
            }
            if (!hasSender) {
              tx.executeSql('ALTER TABLE MerchantCategoryMapping ADD COLUMN sender TEXT');
            }
          });

          // Create Indexes
          Indexes.forEach(index => {
            tx.executeSql(index);
          });

          // Seed default data if Categories table is empty
          tx.executeSql('SELECT count(*) as count FROM Categories', [], (_, result) => {
            if (result.rows.item(0).count === 0) {
              Seed.categories.forEach(category => {
                tx.executeSql(
                  'INSERT INTO Categories (id, name, icon, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
                  [category.id, category.name, category.icon, category.color, new Date().toISOString(), new Date().toISOString()]
                );
              });
            }
          });
        },
        (error) => reject(error),
        () => resolve()
      );
    });
  }
}

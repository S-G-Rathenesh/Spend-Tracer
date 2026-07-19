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

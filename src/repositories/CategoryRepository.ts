import { DatabaseService } from '../database/DatabaseService';
import { Category } from '../types/Category';

export class CategoryRepository {
  static async getAll(): Promise<Category[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM Categories ORDER BY name ASC', [], (_, results) => {
          let categories = [];
          for (let i = 0; i < results.rows.length; i++) {
            categories.push(results.rows.item(i));
          }
          resolve(categories);
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async getById(id: string): Promise<Category | null> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM Categories WHERE id = ?', [id], (_, results) => {
          if (results.rows.length > 0) {
            resolve(results.rows.item(0));
          } else {
            resolve(null);
          }
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async insert(category: Category): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO Categories (id, name, icon, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [category.id, category.name, category.icon, category.color, category.createdAt, category.updatedAt],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async update(category: Category): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE Categories SET name = ?, icon = ?, color = ?, updatedAt = ? WHERE id = ?',
          [category.name, category.icon, category.color, category.updatedAt, category.id],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async delete(id: string): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM Categories WHERE id = ?',
          [id],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}

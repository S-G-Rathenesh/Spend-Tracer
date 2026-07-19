import { DatabaseService } from '../database/DatabaseService';
import { Transaction } from '../types/Transaction';

export interface TransactionFilter {
  categoryId?: string;
  type?: 'Debit' | 'Credit';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export class TransactionRepository {
  static async getTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
    const db = DatabaseService.getDB();
    
    let query = `
      SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
      FROM Transactions t
      LEFT JOIN Categories c ON t.categoryId = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.categoryId) {
      query += ` AND t.categoryId = ?`;
      params.push(filter.categoryId);
    }
    if (filter.type) {
      query += ` AND t.type = ?`;
      params.push(filter.type);
    }
    if (filter.startDate) {
      query += ` AND t.date >= ?`;
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      query += ` AND t.date <= ?`;
      params.push(filter.endDate);
    }
    if (filter.minAmount !== undefined) {
      query += ` AND t.amount >= ?`;
      params.push(filter.minAmount);
    }
    if (filter.maxAmount !== undefined) {
      query += ` AND t.amount <= ?`;
      params.push(filter.maxAmount);
    }
    if (filter.searchQuery) {
      query += ` AND (t.notes LIKE ? OR t.merchantId LIKE ? OR t.bank LIKE ?)`;
      params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
    }

    switch (filter.sortBy) {
      case 'date_asc':
        query += ` ORDER BY t.date ASC, t.time ASC`;
        break;
      case 'amount_desc':
        query += ` ORDER BY t.amount DESC`;
        break;
      case 'amount_asc':
        query += ` ORDER BY t.amount ASC`;
        break;
      case 'date_desc':
      default:
        query += ` ORDER BY t.date DESC, t.time DESC`;
        break;
    }

    if (filter.limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(filter.limit);
      if (filter.offset !== undefined) {
        query += ` OFFSET ?`;
        params.push(filter.offset);
      }
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(query, params, (_, results) => {
          let transactions = [];
          for (let i = 0; i < results.rows.length; i++) {
            transactions.push(results.rows.item(i));
          }
          resolve(transactions);
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async insert(t: Transaction): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO Transactions (
            id, amount, merchantId, bank, categoryId, type, date, time, 
            referenceNumber, transactionType, notes, source, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id, t.amount, t.merchantId || null, t.bank || null, t.categoryId || null,
            t.type, t.date, t.time, t.referenceNumber || null, t.transactionType || null,
            t.notes || null, t.source, t.createdAt, t.updatedAt
          ],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async update(t: Transaction): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE Transactions SET 
            amount = ?, merchantId = ?, bank = ?, categoryId = ?, type = ?, 
            date = ?, time = ?, referenceNumber = ?, transactionType = ?, 
            notes = ?, source = ?, updatedAt = ?
           WHERE id = ?`,
          [
            t.amount, t.merchantId || null, t.bank || null, t.categoryId || null,
            t.type, t.date, t.time, t.referenceNumber || null, t.transactionType || null,
            t.notes || null, t.source, t.updatedAt, t.id
          ],
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
          'DELETE FROM Transactions WHERE id = ?',
          [id],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async deleteAll(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('DELETE FROM Transactions', [], () => resolve(), (error) => { reject(error); return false; });
      });
    });
  }
}

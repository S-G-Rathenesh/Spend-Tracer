import { DatabaseService } from '../database/DatabaseService';
import { Transaction } from '../types/Transaction';
import { MerchantCategoryRepository, MatchType } from './MerchantCategoryRepository';


export interface TransactionFilter {
  categoryId?: string;
  type?: 'Debit' | 'Credit';
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED' | 'UNKNOWN' | 'ALL';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  needsVerification?: boolean;
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
      LEFT JOIN Categories c ON (t.categoryId = c.id OR t.categoryId = c.name)
      WHERE 1=1
    `;
    const params: any[] = [];

    const targetStatus = filter.status || 'COMPLETED';
    if (targetStatus !== 'ALL') {
      query += ` AND t.status = ?`;
      params.push(targetStatus);
    }

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
    if (filter.needsVerification !== undefined) {
      query += ` AND t.needsVerification = ?`;
      params.push(filter.needsVerification ? 1 : 0);
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
            const row = results.rows.item(i);
            row.needsVerification = row.needsVerification === 1;
            try {
              row.sources = row.sources ? JSON.parse(row.sources) : undefined;
            } catch (e) {
              row.sources = undefined;
            }
            transactions.push(row);
          }
          if (transactions.length > 0) {
            console.log(`[DATE_PIPELINE] 5. Value retrieved from SQLite: ${transactions[0].date}`);
          }
          resolve(transactions);
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async getById(id: string): Promise<Transaction | null> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
           FROM Transactions t
           LEFT JOIN Categories c ON (t.categoryId = c.id OR t.categoryId = c.name)
           WHERE t.id = ?`,
          [id],
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              row.needsVerification = row.needsVerification === 1;
              try {
                row.sources = row.sources ? JSON.parse(row.sources) : undefined;
              } catch (e) {
                row.sources = undefined;
              }
              resolve(row);
            } else {
              resolve(null);
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static generateFingerprint(t: Partial<Transaction>): string {
    // Fingerprint: amount|type|bank|referenceNumber|merchantId|date|time
    const amt = t.amount?.toString() || '0';
    const type = t.type || 'Unknown';
    const bank = (t.bank || '').toLowerCase().trim();
    const ref = (t.referenceNumber || '').toLowerCase().trim();
    const merchant = (t.merchantId || '').toLowerCase().trim();
    const date = t.date || '';
    const time = t.time || '';
    return `${amt}|${type}|${bank}|${ref}|${merchant}|${date}|${time}`;
  }

  static async existsByFingerprint(fingerprint: string): Promise<boolean> {
    const db = DatabaseService.getDB();
    // Since we don't have a fingerprint column, we must fetch potentially matching recent txns and generate their fingerprints.
    // However, since we can't easily query by fingerprint directly in SQL without the column, 
    // we extract the date from the fingerprint and fetch transactions for that date to check.
    const parts = fingerprint.split('|');
    const date = parts[5]; // date is at index 5
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM Transactions WHERE date = ?',
          [date],
          (_, results) => {
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const rowFingerprint = this.generateFingerprint(row);
              if (rowFingerprint === fingerprint) {
                resolve(true);
                return;
              }
              // Fuzzy match: If everything matches except time, and time is within 2 minutes
              const rowParts = rowFingerprint.split('|');
              const samePrefix = rowParts.slice(0, 6).join('|') === parts.slice(0, 6).join('|');
              if (samePrefix) {
                const inputTime = parts[6];
                const rowTime = rowParts[6];
                if (inputTime && rowTime) {
                  const t1 = new Date(`1970-01-01T${inputTime}Z`).getTime();
                  const t2 = new Date(`1970-01-01T${rowTime}Z`).getTime();
                  if (!isNaN(t1) && !isNaN(t2) && Math.abs(t1 - t2) <= 2 * 60 * 1000) {
                    resolve(true);
                    return;
                  }
                }
              }
            }
            resolve(false);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async existsBySmsHash(smsHash: string): Promise<boolean> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT id FROM Transactions WHERE smsHash = ? LIMIT 1',
          [smsHash],
          (_, results) => resolve(results.rows.length > 0),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async insert(t: Transaction): Promise<void> {
    const fingerprint = this.generateFingerprint(t);
    
    console.log(`\n[TX_PIPELINE]`);
    console.log(`origin: ${t.source}`);
    console.log(`amount: ${t.amount}`);
    console.log(`type: ${t.type}`);
    console.log(`merchant: ${t.merchantId}`);
    console.log(`referenceNumber: ${t.referenceNumber}`);
    console.log(`transactionDate: ${t.date}`);
    console.log(`transactionTime: ${t.time}`);
    console.log(`smsId: ${t.id}`);
    console.log(`smsHash: ${t.smsHash || 'N/A'}`);
    console.log(`fingerprint: ${fingerprint}`);

    console.log(`[TX_INSERT_ATTEMPT] Checking for duplicates...`);
    
    console.log(`[TX_DUPLICATE_CHECK] Searching fingerprint/hash...`);
    
    if (t.smsHash) {
      const hashExists = await this.existsBySmsHash(t.smsHash);
      if (hashExists) {
        console.log(`[DUPLICATE FOUND] Skipping insertion (smsHash match).`);
        return;
      }
    }
    
    const exists = await this.existsByFingerprint(fingerprint);
    if (exists) {
      console.log(`[DUPLICATE FOUND] Skipping insertion (fingerprint match).`);
      return;
    }

    console.log(`[INSERTING]`);

    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR IGNORE INTO Transactions (
            id, amount, merchantId, bank, categoryId, type, status, date, time, 
            referenceNumber, transactionType, notes, source, needsVerification, sources, smsHash, originalSms, aiCategory, aiConfidence, userCategory, finalCategory, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id, t.amount, t.merchantId || null, t.bank || null, t.categoryId || null,
            t.type, t.status || 'COMPLETED', t.date, t.time, t.referenceNumber || null, t.transactionType || null,
            t.notes || null, t.source, t.needsVerification ? 1 : 0, t.sources ? JSON.stringify(t.sources) : null, t.smsHash || null, t.originalSms || null, t.aiCategory || null, t.aiConfidence || null, t.userCategory || null, t.finalCategory || null, t.createdAt, t.updatedAt
          ],
          (_, results) => {
            if (results.rowsAffected && results.rowsAffected > 0) {
              console.log(`[TX_INSERT_SUCCESS] Transaction ${t.id} successfully inserted into SQLite`);
            } else {
              console.log(`[TX_INSERT_SKIPPED] Transaction ${t.id} already exists in DB (Atomic UNIQUE constraint)`);
            }
            resolve();
          },
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
            amount = ?, merchantId = ?, bank = ?, categoryId = ?, type = ?, status = ?,
            date = ?, time = ?, referenceNumber = ?, transactionType = ?, 
            notes = ?, source = ?, needsVerification = ?, sources = ?, smsHash = ?, originalSms = ?, aiCategory = ?, aiConfidence = ?, userCategory = ?, finalCategory = ?, updatedAt = ?
           WHERE id = ?`,
          [
            t.amount, t.merchantId || null, t.bank || null, t.categoryId || null,
            t.type, t.status || 'COMPLETED', t.date, t.time, t.referenceNumber || null, t.transactionType || null,
            t.notes || null, t.source, t.needsVerification ? 1 : 0, t.sources ? JSON.stringify(t.sources) : null, t.smsHash || null, t.originalSms || null, t.aiCategory || null, t.aiConfidence || null, t.userCategory || null, t.finalCategory || null, t.updatedAt, t.id
          ],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }


  /**
   * Searches existing transactions for the exact same account / payee identity
   * and automatically updates them to the learned category with 100% confidence,
   * dropping them from the Pending Verification queue.
   * 
   * MATCH CONFIDENCE SAFETY:
   * - Only performs bulk auto-categorization if matchType is EXACT_UPI, EXACT_PAYEE, or EXACT_MERCHANT.
   * - If matchType is WEAK_MATCH or EXACT_SMS, NO OTHER transactions are touched.
   * - NEVER matches on user bank account number, SMS sender, or generic words.
   */
  static async autoCategorizeMatchingTransactions(matching: {
    category: string;
    matchType?: MatchType;
    upiId?: string | null;
    accountIdentifier?: string | null;
    normalizedName?: string | null;
    merchantName?: string | null;
    smsHash?: string | null;
    excludeId?: string | null;
  }): Promise<{ updatedCount: number; updatedIds: string[] }> {
    const { matchType = 'WEAK_MATCH', category: targetCat } = matching;

    // Safety guard: Weak matches and single SMS matches NEVER bulk-update other transactions
    if (matchType === 'WEAK_MATCH' || matchType === 'EXACT_SMS') {
      console.log(`[AUTO_CATEGORIZE] Skipping bulk update: matchType is ${matchType}`);
      return { updatedCount: 0, updatedIds: [] };
    }

    const targetUpi = matching.upiId ? matching.upiId.toLowerCase().trim() : null;
    const targetNorm = (matching.normalizedName && !MerchantCategoryRepository.isGenericName(matching.normalizedName) && matching.normalizedName.length >= 3)
      ? matching.normalizedName.toLowerCase().trim()
      : null;

    if (!targetUpi && !targetNorm) {
      console.log(`[AUTO_CATEGORIZE] No strong UPI ID or Payee Name found for bulk categorization`);
      return { updatedCount: 0, updatedIds: [] };
    }

    const db = DatabaseService.getDB();
    const allTxns = await this.getTransactions({ status: 'ALL' });
    const matchingIds: string[] = [];

    for (const tx of allTxns) {
      if (matching.excludeId && tx.id === matching.excludeId) continue;

      let isMatch = false;

      // 1. Check EXACT UPI ID match (Highest Confidence)
      if (targetUpi) {
        const txUpi = MerchantCategoryRepository.extractUpiId(tx.originalSms, tx.merchantId);
        if (txUpi && txUpi.toLowerCase().trim() === targetUpi) {
          isMatch = true;
        }
      }

      // 2. Check EXACT Normalized Payee / Merchant Name (Strict equality, Non-generic)
      if (!isMatch && targetNorm) {
        const txNorm = MerchantCategoryRepository.normalizeMerchantName(tx.merchantId || '');
        if (txNorm && txNorm.toLowerCase().trim() === targetNorm) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matchingIds.push(tx.id);
      }
    }

    if (matchingIds.length === 0) {
      return { updatedCount: 0, updatedIds: [] };
    }

    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = matchingIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE Transactions SET 
            categoryId = ?, 
            userCategory = ?, 
            finalCategory = ?, 
            aiConfidence = 1.0, 
            needsVerification = 0, 
            updatedAt = ? 
           WHERE id IN (${placeholders})`,
          [targetCat, targetCat, targetCat, now, ...matchingIds],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });

    console.log(`[AUTO_CATEGORIZE] Updated ${matchingIds.length} matching same-account transactions to category "${targetCat}"`);
    return { updatedCount: matchingIds.length, updatedIds: matchingIds };
  }

  /**
   * Safely cleans up transactions that were incorrectly set to Cashback due to broad account matching.
   * - A Debit transaction is NEVER Cashback.
   * - A Credit transaction whose sender/SMS has no cashback indication and whose payee is an individual/unrelated entity is reverted to Needs Verification.
   */
  static async sanitizeCorruptedCashbackTransactions(): Promise<number> {
    const db = DatabaseService.getDB();
    const allTxns = await this.getTransactions({ status: 'ALL' });
    const corruptedIds: string[] = [];

    for (const tx of allTxns) {
      if (tx.categoryId === 'Cashback' || tx.userCategory === 'Cashback' || tx.finalCategory === 'Cashback') {
        const isDebit = tx.type === 'Debit';
        const sms = (tx.originalSms || '').toLowerCase();
        const hasExplicitCashback = sms.includes('cashback') || sms.includes('cash back') || sms.includes('reward');

        // If it's a debit OR a credit with no cashback wording from person payees
        if (isDebit || (!hasExplicitCashback && tx.merchantId && !tx.merchantId.toLowerCase().includes('google') && !tx.merchantId.toLowerCase().includes('cashback'))) {
          corruptedIds.push(tx.id);
        }
      }
    }

    if (corruptedIds.length === 0) return 0;

    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = corruptedIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE Transactions SET 
            categoryId = 'Others', 
            userCategory = NULL, 
            finalCategory = 'Others', 
            aiConfidence = 0.5, 
            needsVerification = 1, 
            updatedAt = ? 
           WHERE id IN (${placeholders})`,
          [now, ...corruptedIds],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });

    console.log(`[DATA_CLEANUP] Reverted ${corruptedIds.length} corrupted Cashback transactions to Pending Verification`);
    return corruptedIds.length;
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

  static async existsByReferenceOrDetails(reference?: string | null, amount?: number | null, date?: string | null, merchant?: string | null): Promise<boolean> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = 'SELECT COUNT(*) as count FROM Transactions WHERE 1=0';
        const params: any[] = [];
        if (reference) {
          query += ' OR referenceNumber = ?';
          params.push(reference);
        }
        if (amount && date) {
          query += ' OR (amount = ? AND date = ? AND (merchantId = ? OR notes LIKE ?))';
          params.push(amount, date, merchant || '', `%${merchant || ''}%`);
        }
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const count = results.rows.item(0).count;
            resolve(count > 0);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async deleteAll(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // First get count for logging
        tx.executeSql('SELECT COUNT(*) as count FROM Transactions', [], (_, results) => {
          const count = results.rows.item(0).count;
          console.log(`[DELETE_ALL] Total transactions before deletion: ${count}`);
          
          tx.executeSql(
            'DELETE FROM Transactions',
            [],
            (_, deleteResult) => {
              console.log(`[DELETE_ALL] Rows deleted: ${deleteResult.rowsAffected}`);
              resolve();
            },
            (error) => { reject(error); return false; }
          );
        });
      });
    });
  }

  static async getAll(): Promise<Transaction[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
           FROM Transactions t
           LEFT JOIN Categories c ON t.categoryId = c.id
           ORDER BY t.date DESC, t.time DESC`,
          [],
          (_, results) => {
            let transactions = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              row.needsVerification = row.needsVerification === 1;
              transactions.push(row);
            }
            resolve(transactions);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async cleanupHistoricalFailedTransactions(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Fetch all transactions that might be failed
        tx.executeSql(
          `SELECT * FROM Transactions WHERE originalSms IS NOT NULL AND status = 'COMPLETED'`,
          [],
          (_, results) => {
            const updates: string[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const smsText = (row.originalSms || '').toLowerCase();
              
              const failureKeywords = [
                'declined', 'decline', 'failed', 'failure', 'unsuccessful',
                'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
                'could not be completed', 'unable to process', 'not authorized'
              ];
              
              if (failureKeywords.some(kw => smsText.includes(kw))) {
                // Determine if it was actually reversed (refunded)
                if (smsText.includes('reversed') || smsText.includes('refunded')) {
                  updates.push(`UPDATE Transactions SET status = 'REVERSED', needsVerification = 0 WHERE id = '${row.id}';`);
                } else {
                  updates.push(`UPDATE Transactions SET status = 'FAILED', needsVerification = 0 WHERE id = '${row.id}';`);
                }
              }
            }

            if (updates.length > 0) {
              console.log(`[CLEANUP] Found ${updates.length} historical failed/reversed transactions.`);
              // Execute all updates
              const nextUpdate = (index: number) => {
                if (index >= updates.length) {
                  resolve();
                  return;
                }
                tx.executeSql(updates[index], [], () => {
                  nextUpdate(index + 1);
                }, (err) => {
                  console.error('Error updating historical transaction', err);
                  nextUpdate(index + 1); // continue on error
                  return false;
                });
              };
              nextUpdate(0);
            } else {
              resolve();
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async cleanupHistoricalInformationalTransactions(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Fetch all transactions that might be informational false positives
        tx.executeSql(
          `SELECT id, originalSms, amount, bank FROM Transactions WHERE originalSms IS NOT NULL`,
          [],
          (_, results) => {
            const idsToDelete: string[] = [];
            
            const informationalPatterns = [
              'cooling period', 'cooling-period',
              'transaction limit', 'daily limit', 'monthly limit', 'per day limit',
              'upi limit', 'card limit', 'usage limit', 'transfer limit', 'spending limit',
              'credit limit', 'withdrawal limit', 'maximum limit', 'minimum limit',
              'allowed limit', 'eligible limit', 'limit is', 'limit for', 'limit of',
              'limit applies', 'limit has been', 'limit increased', 'limit decreased',
              'service charge', 'service charges', 'charges applicable', 'annual fee',
              'rate of interest', 'charges for', 'maintenance charges',
              'new user registration', 'registration', 'registered successfully',
              'activation', 'deactivation', 'security notice', 'security advisory',
              'security alert', 'fraud alert', 'kyc reminder', 'update kyc', 'complete kyc',
              'terms and conditions', 'terms & conditions', 'terms apply', 'terms and policy',
              'pack validity', 'validity of', 'balance enquiry', 'available balance is',
              'otp', 'one time password', 'verification code', 'do not share'
            ];

            const explicitActionPatterns = [
              'debited', 'credited', 'paid to', 'spent on', 'withdrawn', 'transferred to', 'transferred successfully', 'refund received', 'refund credited', 'recharge successful'
            ];

            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const smsText = (row.originalSms || '').toLowerCase();
              
              const hasInfoPattern = informationalPatterns.some(pat => smsText.includes(pat));
              if (hasInfoPattern) {
                const hasExplicitAction = explicitActionPatterns.some(pat => smsText.includes(pat));
                if (!hasExplicitAction) {
                  idsToDelete.push(row.id);
                }
              }
            }

            if (idsToDelete.length > 0) {
              console.log(`[CLEANUP] Found ${idsToDelete.length} historical informational/false transactions to remove.`);
              const placeholders = idsToDelete.map(() => '?').join(',');
              tx.executeSql(
                `DELETE FROM Transactions WHERE id IN (${placeholders})`,
                idsToDelete,
                (_, delResult) => {
                  console.log(`[CLEANUP] Removed ${delResult.rowsAffected} false transactions.`);
                  resolve();
                },
                (err) => {
                  console.error('Error deleting historical informational transactions', err);
                  resolve();
                  return false;
                }
              );
            } else {
              resolve();
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}

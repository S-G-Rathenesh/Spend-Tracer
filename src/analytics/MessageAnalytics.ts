import { DatabaseService } from '../database/DatabaseService';
import { SMSClassifier, ClassificationResult } from '../ai/SMSClassifier';
import { IncomingSMS } from '../sms/SMSModels';
import { Transaction } from '../types/Transaction';

export interface MessageDistribution {
  transactions: number;
  spam: number;
  nonTransaction: number;
  advertisement: number;
  total: number;
}

export interface EnrichedSMS extends IncomingSMS {
  classification: ClassificationResult;
  linkedTransaction?: Transaction;
}

export class MessageAnalytics {
  static async getMessageDistribution(month?: string, year?: string): Promise<MessageDistribution> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT predictedClass FROM IncomingSMS`;
    const params: any[] = [];
    
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      query += ` WHERE receivedAt >= ? AND receivedAt <= ?`;
      params.push(`${year}-${mStr}-01`, `${year}-${mStr}-31T99:99:99`);
    } else if (year) {
      query += ` WHERE receivedAt >= ? AND receivedAt <= ?`;
      params.push(`${year}-01-01`, `${year}-12-31T99:99:99`);
    }
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            let transactions = 0;
            let spam = 0;
            let nonTransaction = 0;
            let advertisement = 0;
            
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              
              switch (row.predictedClass) {
                case 'Transaction': transactions++; break;
                case 'Scam': spam++; break;
                case 'Personal': nonTransaction++; break;
                case 'Promotion': advertisement++; break;
                default: 
                  // Fallback for older unprocessed rows if any (should be caught by migration)
                  nonTransaction++;
                  break;
              }
            }
            
            resolve({
              transactions,
              spam,
              nonTransaction,
              advertisement,
              total: results.rows.length
            });
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getDetailedMessagesByCategory(
    category: 'Transactions' | 'Non-Transactions' | 'Advertisements' | 'Spam' | 'All',
    month?: string,
    year?: string
  ): Promise<EnrichedSMS[]> {
    const db = DatabaseService.getDB();
    
    // Convert 'category' back to SMSClassifier expected 'predictedClass' strings
    let targetClass: string | null = null;
    if (category === 'Transactions') targetClass = 'Transaction';
    if (category === 'Non-Transactions') targetClass = 'Personal';
    if (category === 'Advertisements') targetClass = 'Promotion';
    if (category === 'Spam') targetClass = 'Scam';

    let querySMS = `SELECT * FROM IncomingSMS`;
    const paramsSMS: any[] = [];
    
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      querySMS += ` WHERE receivedAt >= ? AND receivedAt <= ?`;
      paramsSMS.push(`${year}-${mStr}-01`, `${year}-${mStr}-31T99:99:99`);
    } else if (year) {
      querySMS += ` WHERE receivedAt >= ? AND receivedAt <= ?`;
      paramsSMS.push(`${year}-01-01`, `${year}-12-31T99:99:99`);
    }
    querySMS += ` ORDER BY receivedAt DESC`;

    // 1. Fetch SMS
    const messages = await new Promise<IncomingSMS[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          querySMS,
          paramsSMS,
          (_, results) => {
            const data: IncomingSMS[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              data.push(results.rows.item(i));
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });

    // 2. Fetch Transactions for the same period to map linkages
    let queryTx = `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor FROM Transactions t LEFT JOIN Categories c ON t.categoryId = c.id WHERE t.status = 'COMPLETED'`;
    const paramsTx: any[] = [];
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      queryTx += ` WHERE t.date >= ? AND t.date <= ?`;
      paramsTx.push(`${year}-${mStr}-01`, `${year}-${mStr}-31`);
    } else if (year) {
      queryTx += ` WHERE t.date >= ? AND t.date <= ?`;
      paramsTx.push(`${year}-01-01`, `${year}-12-31`);
    }

    const transactions = await new Promise<Transaction[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          queryTx,
          paramsTx,
          (_, results) => {
            const data: Transaction[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              data.push(results.rows.item(i));
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });

    // Build a map of Original SMS -> Transaction for O(1) linkage check
    // We also map smsHash if available for better mapping
    const txMapByOriginalSMS = new Map<string, Transaction>();
    const txMapByHash = new Map<string, Transaction>();
    
    for (const tx of transactions) {
      if (tx.originalSms) {
        txMapByOriginalSMS.set(tx.originalSms, tx);
      }
      if (tx.smsHash) {
        txMapByHash.set(tx.smsHash, tx);
      }
    }

    // 3. Process, link, and filter
    const enrichedMessages: EnrichedSMS[] = [];

    for (const sms of messages) {
      // Use the database-persisted classification
      const predictedClass = sms.predictedClass as any || 'Personal';
      const confidence = sms.confidence || 0.90;
      let reasons: string[] = [];
      try {
        if (sms.reasons) reasons = JSON.parse(sms.reasons as any);
      } catch(e) {}

      const classification: ClassificationResult = {
        predictedClass,
        confidence,
        classId: predictedClass === 'Transaction' ? 0 : predictedClass === 'Personal' ? 1 : predictedClass === 'Promotion' ? 2 : 3,
        isTransaction: predictedClass === 'Transaction',
        logits: [],
        reasons
      };
      
      // Filter by category if requested
      if (targetClass && classification.predictedClass !== targetClass) {
        continue;
      }

      let linkedTx = txMapByOriginalSMS.get(sms.message);
      
      enrichedMessages.push({
        ...sms,
        classification,
        linkedTransaction: linkedTx
      });
    }

    return enrichedMessages;
  }
}

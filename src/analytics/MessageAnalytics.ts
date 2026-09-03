import { DatabaseService } from '../database/DatabaseService';
import { SMSClassifier, ClassificationResult } from '../ai/SMSClassifier';
import { IncomingSMS } from '../sms/SMSModels';
import { Transaction } from '../types/Transaction';
import { DateRange } from './AnalyticsDateUtils';

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
  static async getMessageDistribution(range: DateRange): Promise<MessageDistribution> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT predictedClass FROM IncomingSMS`;
    const params: any[] = [];
    
    if (range.startDate && range.endDate) {
      query += ` WHERE substr(receivedAt, 1, 10) >= ? AND substr(receivedAt, 1, 10) <= ?`;
      params.push(range.startDate, range.endDate);
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
    range: DateRange
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
    
    if (range.startDate && range.endDate) {
      querySMS += ` WHERE substr(receivedAt, 1, 10) >= ? AND substr(receivedAt, 1, 10) <= ?`;
      paramsSMS.push(range.startDate, range.endDate);
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
    let queryTx = `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor 
                   FROM Transactions t 
                   LEFT JOIN Categories c ON t.categoryId = c.id 
                   WHERE t.status = 'COMPLETED'`;
    const paramsTx: any[] = [];
    if (range.startDate && range.endDate) {
      queryTx += ` AND t.date >= ? AND t.date <= ?`;
      paramsTx.push(range.startDate, range.endDate);
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

    // Build map for O(1) linkage check
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

      let linkedTx = txMapByOriginalSMS.get(sms.message) || (sms.id ? txMapByHash.get(sms.id) : undefined);
      
      enrichedMessages.push({
        ...sms,
        classification,
        linkedTransaction: linkedTx
      });
    }

    return enrichedMessages;
  }
}

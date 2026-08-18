import { DatabaseService } from '../database/DatabaseService';
import { SMSClassifier } from './SMSClassifier';
import { Logger } from '../utils/Logger';

interface CategoryStats {
  count: number;
  totalConfidence: number;
  examples: { sender: string; message: string; confidence: number; reasons: string[] }[];
}

export interface ReclassificationReport {
  total: number;
  categories: Record<string, CategoryStats>;
}

export class SmsReclassifier {
  /**
   * Re-evaluates all IncomingSMS with the latest SMSClassifier.
   * If an SMS changes its classification from Transaction to Promotion/Personal/Scam,
   * it will delete the corresponding Transaction from the Transactions table.
   * Returns a diagnostic report with distribution and examples.
   */
  static async reclassifyAll(onProgress?: (progress: number, total: number) => void): Promise<ReclassificationReport> {
    const db = DatabaseService.getDB();
    
    const report: ReclassificationReport = {
      total: 0,
      categories: {
        Transaction: { count: 0, totalConfidence: 0, examples: [] },
        Personal: { count: 0, totalConfidence: 0, examples: [] },
        Promotion: { count: 0, totalConfidence: 0, examples: [] },
        Scam: { count: 0, totalConfidence: 0, examples: [] },
      }
    };

    try {
      Logger.info('SmsReclassifier', 'Starting full SMS reclassification');

      // 1. Fetch all IncomingSMS
      const smsRecords = await new Promise<any[]>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM IncomingSMS`,
            [],
            (_, results) => {
              const data = [];
              for (let i = 0; i < results.rows.length; i++) {
                data.push(results.rows.item(i));
              }
              resolve(data);
            },
            (error) => { reject(error); return false; }
          );
        });
      });

      if (smsRecords.length === 0) {
        Logger.info('SmsReclassifier', 'No SMS records found to reclassify');
        if (onProgress) onProgress(0, 0);
        return report;
      }

      report.total = smsRecords.length;
      const dummyPooled = new Float32Array(512);
      let processed = 0;

      // Wrap updates in batches for performance
      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          for (const sms of smsRecords) {
            const classification = SMSClassifier.classify(dummyPooled, sms.message);
            const newClass = classification.predictedClass;
            
            // Track stats for the diagnostic report
            const catStats = report.categories[newClass];
            if (catStats) {
              catStats.count++;
              catStats.totalConfidence += classification.confidence;
              if (catStats.examples.length < 10) {
                catStats.examples.push({
                  sender: sms.sender || 'Unknown',
                  message: (sms.message || '').substring(0, 120),
                  confidence: classification.confidence,
                  reasons: classification.reasons
                });
              }
            }

            // 2. Update IncomingSMS
            tx.executeSql(
              `UPDATE IncomingSMS SET predictedClass = ?, confidence = ?, reasons = ?, updatedAt = ? WHERE id = ?`,
              [
                newClass, 
                classification.confidence, 
                JSON.stringify(classification.reasons), 
                new Date().toISOString(), 
                sms.id
              ]
            );

            // 3. Delete orphaned transactions
            if (newClass !== 'Transaction') {
              tx.executeSql(
                `DELETE FROM Transactions WHERE originalSms = ?`,
                [sms.message],
                (_, results) => {
                  if (results.rowsAffected > 0) {
                    Logger.info('SmsReclassifier', `Deleted orphaned transaction for SMS ID: ${sms.id}`);
                  }
                }
              );
            }

            processed++;
            if (onProgress && processed % 50 === 0) {
              onProgress(processed, smsRecords.length);
            }
          }
        }, 
        (error) => { reject(error); return false; },
        () => resolve());
      });

      if (onProgress) onProgress(smsRecords.length, smsRecords.length);

      // Print diagnostic report
      SmsReclassifier.printReport(report);

      Logger.info('SmsReclassifier', 'Reclassification complete');
      return report;
    } catch (error) {
      Logger.error('SmsReclassifier', 'Failed to reclassify SMS', error);
      throw error;
    }
  }

  private static printReport(report: ReclassificationReport): void {
    console.log('\n========================================');
    console.log('  SMS RECLASSIFICATION DIAGNOSTIC REPORT');
    console.log('========================================');
    console.log(`Total SMS: ${report.total}\n`);

    for (const [category, stats] of Object.entries(report.categories)) {
      const avgConf = stats.count > 0 ? ((stats.totalConfidence / stats.count) * 100).toFixed(1) : '0.0';
      const pct = report.total > 0 ? ((stats.count / report.total) * 100).toFixed(1) : '0.0';
      console.log(`${category}: ${stats.count} (${pct}%) — Avg Confidence: ${avgConf}%`);
    }

    console.log('\n--- EXAMPLES PER CATEGORY ---');
    for (const [category, stats] of Object.entries(report.categories)) {
      console.log(`\n== ${category.toUpperCase()} ==`);
      if (stats.examples.length === 0) {
        console.log('  (no examples)');
      }
      stats.examples.forEach((ex, i) => {
        console.log(`  ${i + 1}. [${ex.sender}] ${ex.message}`);
        console.log(`     Confidence: ${(ex.confidence * 100).toFixed(0)}% | Reasons: ${ex.reasons.join(', ')}`);
      });
    }
    console.log('\n========================================\n');
  }
}

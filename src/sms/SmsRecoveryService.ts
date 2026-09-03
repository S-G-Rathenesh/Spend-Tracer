import { NativeModules, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import { SpendTracerAI } from '../ai/SpendTracerAI';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { Transaction } from '../types/Transaction';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';
import { HashUtils } from '../utils/HashUtils';
import { SMSRepository } from './SMSRepository';
import { IncomingSMS, SMSStatus } from './SMSModels';
import { SMSClassifier } from '../ai/SMSClassifier';

const { SmsReaderModule } = NativeModules;

export interface RecoveryProgress {
  status: 'idle' | 'reading' | 'processing' | 'completed' | 'cancelled' | 'error';
  totalSms: number;
  processedSms: number;
  restoredTransactions: number;
  skippedTransactions: number; // For backward compatibility
  classifiedTransactions: number;
  classifiedNonTransactions: number;
  classifiedAdvertisements: number;
  classifiedSpam: number;
}

export class SmsRecoveryService {
  private static isCancelled = false;
  private static progressCallback: ((progress: RecoveryProgress) => void) | null = null;
  private static progressState: RecoveryProgress = {
    status: 'idle', 
    totalSms: 0, 
    processedSms: 0, 
    restoredTransactions: 0, 
    skippedTransactions: 0,
    classifiedTransactions: 0,
    classifiedNonTransactions: 0,
    classifiedAdvertisements: 0,
    classifiedSpam: 0
  };

  public static subscribe(callback: (p: RecoveryProgress) => void) {
    this.progressCallback = callback;
  }

  private static emitProgress(updates: Partial<RecoveryProgress>) {
    this.progressState = { ...this.progressState, ...updates };
    if (this.progressCallback) {
      this.progressCallback(this.progressState);
    }
  }

  public static cancelRecovery() {
    this.isCancelled = true;
    this.emitProgress({ status: 'cancelled' });
  }

  public static async startRecovery(mode: 'full' | 'quick'): Promise<void> {
    this.isCancelled = false;
    this.emitProgress({ 
      status: 'reading', 
      totalSms: 0, 
      processedSms: 0, 
      restoredTransactions: 0, 
      skippedTransactions: 0,
      classifiedTransactions: 0,
      classifiedNonTransactions: 0,
      classifiedAdvertisements: 0,
      classifiedSpam: 0
    });

    try {
      // 1. Request Permission
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('SMS permission denied');
      }

      // 2. Fetch SMS (Quick vs Full)
      let sinceTimestamp = 0;
      if (mode === 'quick') {
        const lastSync = await SettingsRepository.get('last_sms_recovery_timestamp');
        if (lastSync) {
          sinceTimestamp = parseInt(lastSync, 10);
        }
      }

      const rawMessages: any[] = await SmsReaderModule.readSmsInbox(sinceTimestamp);
      
      this.emitProgress({ status: 'processing', totalSms: rawMessages.length });

      if (rawMessages.length === 0) {
        this.emitProgress({ status: 'completed' });
        return;
      }

      // 3. Load existing IncomingSMS keys for O(1) deduplication
      let existingKeys: Set<string>;
      if (mode === 'full') {
        await SMSRepository.clearAll();
        await TransactionRepository.deleteAll();
        existingKeys = new Set<string>();
      } else {
        existingKeys = await SMSRepository.getAllKeys();
      }

      // 4. Process in batches
      const BATCH_SIZE = 100;
      const ai = SpendTracerAI.getInstance();
      await ai.initialize();
      const dummyPooled = new Float32Array(512);

      let highestTimestamp = sinceTimestamp;

      for (let i = 0; i < rawMessages.length; i += BATCH_SIZE) {
        if (this.isCancelled) {
          await SettingsRepository.set('last_sms_recovery_timestamp', highestTimestamp.toString());
          return;
        }

        const batch = rawMessages.slice(i, i + BATCH_SIZE);
        const batchToInsert: IncomingSMS[] = [];

        for (const msg of batch) {
          if (this.isCancelled) break;
          
          if (msg.timestamp > highestTimestamp) {
            highestTimestamp = msg.timestamp;
          }

          const sender = msg.sender || msg.address || '';
          const receivedAtISO = new Date(msg.timestamp).toISOString();
          const dedupKey = `${sender}|${msg.body}|${receivedAtISO}`;

          // Classification for SMS Intelligence
          const cls = SMSClassifier.classify(dummyPooled, msg.body);
          switch (cls.predictedClass) {
            case 'Transaction':
              this.progressState.classifiedTransactions++;
              break;
            case 'Personal':
              this.progressState.classifiedNonTransactions++;
              break;
            case 'Promotion':
              this.progressState.classifiedAdvertisements++;
              break;
            case 'Scam':
              this.progressState.classifiedSpam++;
              break;
          }

          // Persist to IncomingSMS using deterministic ID for clean upserts
          const smsId = 'sms_' + HashUtils.fastHash(dedupKey);
          batchToInsert.push({
            id: smsId,
            sender: sender,
            message: msg.body,
            receivedAt: receivedAtISO,
            normalizedText: msg.body.toLowerCase(),
            bank: sender,
            isProcessed: true,
            processingStatus: SMSStatus.COMPLETED,
            predictedClass: cls.predictedClass,
            confidence: cls.confidence,
            reasons: cls.reasons,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Process full transaction pipeline
          const aiResult = await ai.processSMS(msg.body, 'REBUILD' as any, sender);
          
          if (aiResult.isTransaction) {
            const smsHash = HashUtils.createCanonicalSmsIdentity(sender, msg.body, msg.timestamp, aiResult.amount || 0, aiResult.transactionType, aiResult.reference || undefined, aiResult.merchant || undefined);
            let finalCategory = aiResult.category || 'Others';
            let finalConfidence = aiResult.confidence;
            let needsVerification = aiResult.needsVerification;

            const learned = await MerchantCategoryRepository.getLearnedCategory(aiResult.merchant, msg.body, smsHash, sender, aiResult.bank);
            if (learned) {
              finalCategory = learned.category;
              finalConfidence = 1.0;
              needsVerification = false; // Confirmed user learning
              if (learned.matchedMerchant && (!aiResult.merchant || aiResult.merchant === 'Unknown Merchant')) {
                aiResult.merchant = learned.matchedMerchant;
              }
            }

            const txnRecord: Transaction = {
              id: 'txn_' + Math.random().toString(36).substr(2, 9),
              amount: aiResult.amount || 0,
              merchantId: aiResult.merchant || 'Unknown Merchant',
              bank: aiResult.bank || undefined,
              categoryId: finalCategory,
              type: aiResult.transactionType,
              date: aiResult.date || new Date(msg.timestamp).toISOString().split('T')[0],
              time: new Date(msg.timestamp).toTimeString().split(' ')[0],
              referenceNumber: aiResult.reference || undefined,
              transactionType: aiResult.paymentMode || undefined,
              notes: `Restored via SMS Rebuild (Confidence: ${(finalConfidence * 100).toFixed(0)}%)`,
              source: 'sms',
              smsHash,
              originalSms: aiResult.originalSMS,
              needsVerification,
              aiCategory: aiResult.aiCategory || undefined,
              aiConfidence: aiResult.aiConfidence || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: aiResult.status || 'COMPLETED'
            };


            await TransactionRepository.insert(txnRecord);
            this.progressState.restoredTransactions++;
          } else {
            this.progressState.skippedTransactions++;
          }
          
          this.progressState.processedSms++;
        }

        // Flush batch of IncomingSMS records
        if (batchToInsert.length > 0) {
          await SMSRepository.insertBatch(batchToInsert);
        }

        // Allow UI to breathe
        await new Promise(resolve => setTimeout(resolve, 50));
        this.emitProgress({});
      }

      if (!this.isCancelled) {
        await SettingsRepository.set('last_sms_recovery_timestamp', highestTimestamp.toString());
        this.emitProgress({ status: 'completed' });
        // Emit TransactionUpdated so Analytics and Dashboard immediately refresh with newly rebuilt SMS statistics
        DeviceEventEmitter.emit('TransactionUpdated');
      }

    } catch (e) {
      console.error(e);
      this.emitProgress({ status: 'error' });
    }
  }

  public static async autoQuickSync(): Promise<{ syncedCount: number, status: string }> {
    try {
      const now = Date.now();
      const lastAutoSyncStr = await SettingsRepository.get('last_auto_sync_time');
      if (lastAutoSyncStr) {
        const lastAutoSync = parseInt(lastAutoSyncStr, 10);
        if (now - lastAutoSync < 15000) {
          return { syncedCount: 0, status: 'skipped_optimization' };
        }
      }

      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (!hasPermission) {
        return { syncedCount: 0, status: 'no_permission' };
      }

      let sinceTimestamp = 0;
      const lastSync = await SettingsRepository.get('last_sms_recovery_timestamp');
      if (lastSync) {
        sinceTimestamp = parseInt(lastSync, 10);
      }

      const rawMessages: any[] = await SmsReaderModule.readSmsInbox(sinceTimestamp);

      if (rawMessages.length === 0) {
        await SettingsRepository.set('last_auto_sync_time', now.toString());
        return { syncedCount: 0, status: 'up_to_date' };
      }

      const existingKeys = await SMSRepository.getAllKeys();
      const ai = SpendTracerAI.getInstance();
      await ai.initialize();
      const dummyPooled = new Float32Array(512);

      let highestTimestamp = sinceTimestamp;
      let addedCount = 0;
      const batchToInsert: IncomingSMS[] = [];

      for (const msg of rawMessages) {
        if (msg.timestamp > highestTimestamp) {
          highestTimestamp = msg.timestamp;
        }

        const sender = msg.sender || msg.address || '';
        const receivedAtISO = new Date(msg.timestamp).toISOString();
        const dedupKey = `${sender}|${msg.body}|${receivedAtISO}`;

        const cls = SMSClassifier.classify(dummyPooled, msg.body);
        const smsId = 'sms_' + HashUtils.fastHash(dedupKey);
        batchToInsert.push({
          id: smsId,
          sender: sender,
          message: msg.body,
          receivedAt: receivedAtISO,
          normalizedText: msg.body.toLowerCase(),
          bank: sender,
          isProcessed: true,
          processingStatus: SMSStatus.COMPLETED,
          predictedClass: cls.predictedClass,
          confidence: cls.confidence,
          reasons: cls.reasons,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const aiResult = await ai.processSMS(msg.body, 'LIVE' as any, sender);
        
        if (aiResult.isTransaction) {
          const smsHash = HashUtils.createCanonicalSmsIdentity(sender, msg.body, msg.timestamp, aiResult.amount || 0, aiResult.transactionType, aiResult.reference || undefined, aiResult.merchant || undefined);
          let finalCategory = aiResult.category || 'Others';
          let finalConfidence = aiResult.confidence;
          let needsVerification = aiResult.needsVerification;

          const learned = await MerchantCategoryRepository.getLearnedCategory(aiResult.merchant, msg.body, smsHash, sender, aiResult.bank);
          if (learned) {
            finalCategory = learned.category;
            finalConfidence = 1.0;
            needsVerification = false;
            if (learned.matchedMerchant && (!aiResult.merchant || aiResult.merchant === 'Unknown Merchant')) {
              aiResult.merchant = learned.matchedMerchant;
            }
          }

          const txnRecord: Transaction = {
            id: 'txn_' + Math.random().toString(36).substr(2, 9),
            amount: aiResult.amount || 0,
            merchantId: aiResult.merchant || 'Unknown Merchant',
            bank: aiResult.bank || undefined,
            categoryId: finalCategory,
            type: aiResult.transactionType,
            date: aiResult.date || new Date(msg.timestamp).toISOString().split('T')[0],
            time: new Date(msg.timestamp).toTimeString().split(' ')[0],
            referenceNumber: aiResult.reference || undefined,
            transactionType: aiResult.paymentMode || undefined,
            notes: `Restored via Quick Sync (Confidence: ${(finalConfidence * 100).toFixed(0)}%)`,
            source: 'sms',
            smsHash,
            originalSms: aiResult.originalSMS,
            needsVerification,
            aiCategory: aiResult.aiCategory || undefined,
            aiConfidence: aiResult.aiConfidence || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: aiResult.status || 'COMPLETED'
          };


          await TransactionRepository.insert(txnRecord);
          addedCount++;
        }
      }

      if (batchToInsert.length > 0) {
        await SMSRepository.insertBatch(batchToInsert);
      }

      await SettingsRepository.set('last_sms_recovery_timestamp', highestTimestamp.toString());
      await SettingsRepository.set('last_auto_sync_time', Date.now().toString());

      if (addedCount > 0 || batchToInsert.length > 0) {
        DeviceEventEmitter.emit('TransactionUpdated');
      }

      return { syncedCount: addedCount, status: 'success' };
    } catch (e) {
      console.error('AutoQuickSync Error:', e);
      return { syncedCount: 0, status: 'error' };
    }
  }
}

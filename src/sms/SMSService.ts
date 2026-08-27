import { SpendTracerAI, ProcessingMode } from '../ai/SpendTracerAI';
import { SMSClassifier } from '../ai/SMSClassifier';
import { SMSQueue } from './SMSQueue';
import { SMSStatus } from './SMSModels';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';
import { HashUtils } from '../utils/HashUtils';
import { TransactionReconciliationEngine } from '../engine/TransactionReconciliationEngine';
import { Logger } from '../utils/Logger';
import { DeviceEventEmitter } from 'react-native';

export class SMSService {
  static async processIncoming(taskData: { sender: string; body: string; timestamp: number }): Promise<void> {
    try {
      console.log(`[LIVE_SMS_RECEIVED] Processing new SMS in LIVE mode (Timestamp: ${taskData.timestamp})`);
      const isEnabled = await SettingsRepository.get('smsMonitoringEnabled');
      if (isEnabled === 'false') {
        Logger.info('SMSService', 'SMS Monitoring is paused, ignoring message.');
        return;
      }

      const now = new Date().toISOString();

      // Classify the SMS for SMS Intelligence persistence
      const dummyPooled = new Float32Array(512);
      const cls = SMSClassifier.classify(dummyPooled, taskData.body);

      const sms = {
        id: Math.random().toString(36).substr(2, 9),
        sender: taskData.sender,
        message: taskData.body,
        receivedAt: new Date(taskData.timestamp).toISOString(),
        bank: taskData.sender,
        isProcessed: false,
        processingStatus: SMSStatus.PENDING,
        predictedClass: cls.predictedClass,
        confidence: cls.confidence,
        reasons: cls.reasons,
        createdAt: now,
        updatedAt: now
      };

      await SMSQueue.enqueue(sms as any);

      // Evaluate with AI Pipeline (LIVE Mode)
      const aiResult = await SpendTracerAI.getInstance().processSMS(taskData.body, ProcessingMode.LIVE, taskData.sender);

      if (!aiResult.isTransaction) {
        console.log(`[DATE_PIPELINE] Stage 1 rejected`);
        await SMSQueue.markAsCompleted(sms.id);
        return;
      }
      
      let finalCategory = aiResult.category || 'Shopping';
      let finalConfidence = aiResult.confidence;
      let needsVerification = aiResult.needsVerification;

      const learned = await MerchantCategoryRepository.getLearnedCategory(aiResult.merchant, taskData.body);
      if (learned) {
        finalCategory = learned.category;
        finalConfidence = 1.0;
        needsVerification = false;
        if (learned.matchedMerchant && (!aiResult.merchant || aiResult.merchant === 'Unknown Merchant')) {
          aiResult.merchant = learned.matchedMerchant;
        }
      }

      // Push Candidate to Reconciliation Engine
      const candidate = {
        amount: aiResult.amount || 0,
        type: aiResult.transactionType,
        source: 'sms' as const,
        merchantId: aiResult.merchant || 'Unknown Merchant',
        bank: aiResult.bank || sms.bank || 'Bank',
        categoryId: finalCategory,
        date: aiResult.date || now.split('T')[0],
        time: new Date(taskData.timestamp).toTimeString().split(' ')[0],
        referenceNumber: aiResult.reference || undefined,
        transactionType: aiResult.paymentMode || 'UPI',
        notes: `Extracted via Spend Tracer AI (Confidence: ${(finalConfidence * 100).toFixed(0)}%)`,
        smsHash: HashUtils.createCanonicalSmsIdentity(taskData.sender, taskData.body, taskData.timestamp, aiResult.amount || 0, aiResult.transactionType, aiResult.reference || undefined, aiResult.merchant || undefined),
        originalSms: aiResult.originalSMS,
        needsVerification: needsVerification,
        status: aiResult.status || 'COMPLETED'
      };
      
      console.log(`[SMS_DATE_PIPELINE]`);
      console.log(` - SMS body: ${taskData.body}`);
      console.log(` - Native timestamp: ${taskData.timestamp}`);
      console.log(` - Parsed date: ${aiResult.date}`);
      
      const engine = TransactionReconciliationEngine.getInstance();
      await engine.processCandidate(candidate);
      
      // Crucial Fix: Update last_sms_recovery_timestamp so Auto Quick Sync doesn't re-process this SMS
      await SettingsRepository.set('last_sms_recovery_timestamp', taskData.timestamp.toString());
      
      await SMSQueue.markAsCompleted(sms.id);
      Logger.info('SMSService', `Successfully pushed candidate to reconciliation engine.`);

      // Update Dashboard
      this.notifyDashboard();

    } catch (error) {
      Logger.error('SMSService', 'Error in SMS pipeline', error);
    }
  }

  static notifyDashboard() {
    DeviceEventEmitter.emit('TransactionUpdated');
  }
}

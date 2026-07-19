import { SMSParser } from './SMSParser';
import { SMSValidator } from './SMSValidator';
import { SMSNormalizer } from './SMSNormalizer';
import { SMSFilters } from './SMSFilters';
import { SMSQueue } from './SMSQueue';
import { IncomingSMS, SMSStatus } from './SMSModels';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { Logger } from '../utils/Logger';

export class SMSService {
  static async processIncoming(taskData: { sender: string; body: string; timestamp: number }): Promise<void> {
    try {
      // 1. Check if SMS monitoring is enabled
      const isEnabled = await SettingsRepository.get('smsMonitoringEnabled');
      if (isEnabled === 'false') {
        Logger.info('SMSService', 'SMS Monitoring is paused, ignoring message.');
        return;
      }

      // 2. Validate basic structure
      if (!SMSValidator.validate(taskData.body)) {
        return;
      }

      const now = new Date().toISOString();
      const receivedAt = new Date(taskData.timestamp).toISOString();
      
      const sms: IncomingSMS = {
        id: Math.random().toString(36).substr(2, 9),
        sender: taskData.sender,
        message: taskData.body,
        receivedAt,
        normalizedText: '',
        bank: null,
        isProcessed: false,
        processingStatus: SMSStatus.IGNORED,
        createdAt: now,
        updatedAt: now
      };

      // 3. Filter by Sender (Is it a bank?)
      if (!SMSFilters.isLikelyBankSMS(sms.sender)) {
        sms.processingStatus = SMSStatus.IGNORED;
        await SMSQueue.enqueue(sms);
        return;
      }

      // 4. Extract Bank Name
      sms.bank = SMSParser.extractBankName(sms.sender);
      if (!sms.bank) {
        sms.processingStatus = SMSStatus.IGNORED;
        await SMSQueue.enqueue(sms);
        return;
      }

      // 5. Filter by Content (Is it a transaction?)
      if (!SMSFilters.isTransactionSMS(sms.message)) {
        sms.processingStatus = SMSStatus.IGNORED;
        await SMSQueue.enqueue(sms);
        return;
      }

      // 6. Normalize text
      sms.normalizedText = SMSNormalizer.normalize(sms.message);

      // 7. Enqueue as Pending for Phase 4 AI Processing
      sms.processingStatus = SMSStatus.PENDING;
      await SMSQueue.enqueue(sms);
      
      Logger.info('SMSService', `Successfully queued SMS from ${sms.bank}`);
      
    } catch (error) {
      Logger.error('SMSService', 'Error in SMS pipeline', error);
    }
  }
}

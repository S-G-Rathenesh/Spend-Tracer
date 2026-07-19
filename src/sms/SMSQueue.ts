import { IncomingSMS, SMSStatus } from './SMSModels';
import { SMSRepository } from './SMSRepository';
import { Logger } from '../utils/Logger';

export class SMSQueue {
  static async enqueue(sms: IncomingSMS): Promise<void> {
    try {
      await SMSRepository.insert(sms);
      Logger.info('SMSQueue', `Enqueued SMS ${sms.id} as ${sms.processingStatus}`);
    } catch (error) {
      Logger.error('SMSQueue', 'Failed to enqueue SMS', error);
    }
  }

  static async markAsCompleted(id: string): Promise<void> {
    await SMSRepository.updateStatus(id, SMSStatus.COMPLETED, true);
  }

  static async markAsFailed(id: string): Promise<void> {
    await SMSRepository.updateStatus(id, SMSStatus.FAILED, true);
  }

  static async markAsProcessing(id: string): Promise<void> {
    await SMSRepository.updateStatus(id, SMSStatus.PROCESSING, false);
  }
}

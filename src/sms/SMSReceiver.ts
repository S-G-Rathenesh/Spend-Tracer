/**
 * Android SMS Broadcast Receiver Hook
 * Passes received SMS messages to SMSService for AI pipeline processing and database insertion.
 */

import { SMSService } from './SMSService';
import { Logger } from '../utils/Logger';

export class SMSReceiver {
  public static async onSMSReceived(sender: string, body: string, timestamp: number): Promise<void> {
    try {
      Logger.info('SMSReceiver', `Received SMS broadcast from ${sender}`);
      await SMSService.processIncoming({ sender, body, timestamp });
    } catch (error) {
      Logger.error('SMSReceiver', 'Error handling SMS broadcast', error);
    }
  }
}

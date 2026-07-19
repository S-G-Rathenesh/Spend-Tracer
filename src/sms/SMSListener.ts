import { SMSService } from './SMSService';
import { Logger } from '../utils/Logger';

export const SMSListener = async (taskData: { sender: string; body: string; timestamp: number }) => {
  try {
    Logger.info('SMSListener', 'Received Headless JS Task', { sender: taskData.sender });
    await SMSService.processIncoming(taskData);
  } catch (error) {
    Logger.error('SMSListener', 'Failed to process SMS task', error);
  }
};

import { TransactionReconciliationEngine, ReconcileCandidate } from '../TransactionReconciliationEngine';
import { Logger } from '../../utils/Logger';

// Mock TransactionRepository and Logger for testing
jest.mock('../../repositories/TransactionRepository', () => ({
  TransactionRepository: {
    insert: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../utils/Logger', () => ({
  Logger: {
    info: jest.fn((tag, msg) => console.log(`[${tag}] ${msg}`)),
    error: jest.fn(),
  }
}));

describe('TransactionReconciliationEngine', () => {
  let engine: TransactionReconciliationEngine;

  beforeEach(() => {
    // Reset singleton and buffer
    engine = (TransactionReconciliationEngine as any).getInstance();
    (engine as any).buffer.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should merge Notification and SMS when received within 30s', async () => {
    const notif: ReconcileCandidate = {
      amount: 500,
      type: 'Debit',
      source: 'notification',
      merchantId: 'Swiggy',
      date: '2026-07-30',
      time: '14:00:00'
    };

    const sms: ReconcileCandidate = {
      amount: 500,
      type: 'Debit',
      source: 'sms',
      merchantId: 'SWIGGY', // Similar name
      bank: 'HDFC',
      date: '2026-07-30',
      time: '14:00:10' // 10s difference
    };

    // Push notification (starts timer)
    await engine.processCandidate(notif);
    expect((engine as any).buffer.size).toBe(1);

    // Push SMS (matches and merges)
    await engine.processCandidate(sms);
    
    // Buffer should be cleared immediately
    expect((engine as any).buffer.size).toBe(0);
  });

  it('should save standalone if no match arrives within 30s', async () => {
    const notif: ReconcileCandidate = {
      amount: 200,
      type: 'Debit',
      source: 'notification',
      merchantId: 'Uber',
      date: '2026-07-30',
      time: '14:00:00'
    };

    await engine.processCandidate(notif);
    expect((engine as any).buffer.size).toBe(1);

    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000);

    // Buffer should be cleared after timeout
    expect((engine as any).buffer.size).toBe(0);
  });
});

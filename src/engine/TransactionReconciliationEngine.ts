import { Transaction } from '../types/Transaction';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { Logger } from '../utils/Logger';

export interface ReconcileCandidate extends Partial<Transaction> {
  // Required fields for matching
  amount: number;
  type: 'Debit' | 'Credit';
  source: 'sms' | 'notification' | 'manual' | 'merged';
  // Standard fields
  merchantId?: string;
  bank?: string;
  categoryId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  referenceNumber?: string;
  transactionType?: string;
  notes?: string;
  needsVerification?: boolean;
  smsHash?: string;
}

interface BufferEntry {
  candidate: ReconcileCandidate;
  timer: NodeJS.Timeout;
  timestampMs: number;
}

export class TransactionReconciliationEngine {
  private static instance: TransactionReconciliationEngine;
  private buffer: Map<string, BufferEntry> = new Map();
  private readonly WAIT_WINDOW_MS = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): TransactionReconciliationEngine {
    if (!TransactionReconciliationEngine.instance) {
      TransactionReconciliationEngine.instance = new TransactionReconciliationEngine();
    }
    return TransactionReconciliationEngine.instance;
  }

  /**
   * Calculates a simple similarity score between two strings (0.0 to 1.0).
   * Uses bigram intersection.
   */
  private stringSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (str1 === str2 || str1.includes(str2) || str2.includes(str1)) return 1.0;
    if (str1.length < 2 || str2.length < 2) return 0;

    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const bg1 = getBigrams(str1);
    const bg2 = getBigrams(str2);
    
    let intersectionSize = 0;
    bg1.forEach(bg => {
      if (bg2.has(bg)) intersectionSize++;
    });

    return (2.0 * intersectionSize) / (bg1.size + bg2.size);
  }

  /**
   * Processes an incoming candidate. It either merges with a waiting candidate
   * or holds it in the buffer for 30 seconds.
   */
  public async processCandidate(candidate: ReconcileCandidate): Promise<void> {
    Logger.info('ReconciliationEngine', `[Candidate created] Source: ${candidate.source}, Amount: ${candidate.amount}`);
    
    const candidateTimeMs = new Date(`${candidate.date}T${candidate.time}`).getTime();

    // 1. Check if there's a match in the buffer
    for (const [id, entry] of this.buffer.entries()) {
      const buffered = entry.candidate;
      const bufferedTimeMs = entry.timestampMs;

      // Rule 1: Reference Number match is strongest
      const isRefMatch = !!candidate.referenceNumber && !!buffered.referenceNumber && 
                         candidate.referenceNumber === buffered.referenceNumber;

      // Rule 2: Heuristic Match
      const isAmountMatch = candidate.amount === buffered.amount;
      const isTypeMatch = candidate.type === buffered.type;
      const timeDiffMins = Math.abs(candidateTimeMs - bufferedTimeMs) / 60000;
      
      const merchantSim = this.stringSimilarity(
        candidate.merchantId || '', 
        buffered.merchantId || ''
      );

      const isHeuristicMatch = isAmountMatch && isTypeMatch && merchantSim > 0.80 && timeDiffMins <= 2;

      if (isRefMatch || isHeuristicMatch) {
        Logger.info('ReconciliationEngine', `[Matched] Incoming ${candidate.source} matched with buffered ${buffered.source}`);
        
        // Clear the timer for the buffered item
        clearTimeout(entry.timer);
        this.buffer.delete(id);

        // Merge and save immediately
        await this.mergeAndSave(candidate, buffered);
        return;
      }
    }

    // 2. No match found. Add to buffer.
    const tempId = Math.random().toString(36).substring(7);
    const timer = setTimeout(async () => {
      // If timer expires, save it standalone
      this.buffer.delete(tempId);
      Logger.info('ReconciliationEngine', `[Saved] Timer expired for ${candidate.source}. Saving standalone.`);
      await this.saveStandalone(candidate);
    }, this.WAIT_WINDOW_MS);

    this.buffer.set(tempId, {
      candidate,
      timer,
      timestampMs: candidateTimeMs
    });
  }

  private async mergeAndSave(c1: ReconcileCandidate, c2: ReconcileCandidate): Promise<void> {
    Logger.info('ReconciliationEngine', `[Merged] Merging candidates.`);
    
    // Determine which is which
    let notif: ReconcileCandidate | undefined;
    let sms: ReconcileCandidate | undefined;

    if (c1.source === 'notification') notif = c1;
    else if (c1.source === 'sms') sms = c1;

    if (c2.source === 'notification') notif = c2;
    else if (c2.source === 'sms') sms = c2;

    // If both are same source somehow, just use c1 as base
    const base = notif || c1;
    const secondary = sms || c2;

    // Merge logic: Notification prefers merchant, SMS prefers bank/ref/notes
    const mergedTx: Transaction = {
      id: 'txn_' + Math.random().toString(36).substr(2, 9),
      amount: base.amount,
      type: base.type,
      merchantId: notif?.merchantId || sms?.merchantId || 'Unknown Merchant',
      bank: sms?.bank || notif?.bank,
      categoryId: base.categoryId || secondary.categoryId,
      date: base.date,
      time: base.time,
      referenceNumber: sms?.referenceNumber || notif?.referenceNumber,
      transactionType: sms?.transactionType || notif?.transactionType,
      notes: sms?.notes || notif?.notes,
      source: 'merged',
      sources: [c1.source, c2.source].filter(s => s !== 'merged'),
      smsHash: sms?.smsHash || notif?.smsHash || undefined,
      needsVerification: base.needsVerification || secondary.needsVerification || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await TransactionRepository.insert(mergedTx);
    Logger.info('ReconciliationEngine', `[Saved] Merged transaction ${mergedTx.id} saved.`);
  }

  private async saveStandalone(candidate: ReconcileCandidate): Promise<void> {
    const tx: Transaction = {
      id: 'txn_' + Math.random().toString(36).substr(2, 9),
      amount: candidate.amount,
      type: candidate.type,
      merchantId: candidate.merchantId || 'Unknown Merchant',
      bank: candidate.bank,
      categoryId: candidate.categoryId,
      date: candidate.date,
      time: candidate.time,
      referenceNumber: candidate.referenceNumber,
      transactionType: candidate.transactionType,
      notes: candidate.notes,
      source: candidate.source,
      sources: [candidate.source === 'sms' ? 'SMS' : 'Notification'],
      smsHash: candidate.smsHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await TransactionRepository.insert(tx);
  }
}

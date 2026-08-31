/**
 * Spend Tracer AI - End-to-End Pipeline Orchestrator
 * Fully offline, 3-stage inference pipeline returning standardized transaction objects.
 */

import { Tokenizer } from './Tokenizer';
import { ModelLoader } from './ModelLoader';
import { SMSClassifier, ClassificationResult } from './SMSClassifier';
import { FinancialNER, NERTokenPrediction } from './FinancialNER';
import { EntityReconstruction, ExtractedEntities } from './EntityReconstruction';
import { ExpenseClassifier, ExpenseCategoryResult } from './ExpenseClassifier';
import { PromotionTransactionValidator } from './PromotionTransactionValidator';
import { TransactionValidator } from './TransactionValidator';
import { StatusDetector } from './StatusDetector';

export enum ProcessingMode {
  LIVE = 'LIVE',
  REBUILD = 'REBUILD'
}

export interface SpendTracerAIOutput {
  isTransaction: boolean;
  confidence: number;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  bank: string | null;
  accountSuffix: string | null;
  paymentMode: string | null;
  transactionType: 'Debit' | 'Credit';
  reference: string | null;
  date: string | null;
  category: string | null;
  categoryConfidence: number;
  aiCategory?: string | null;
  aiConfidence?: number;
  originalSMS: string;
  needsVerification: boolean;
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED' | 'UNKNOWN';
}

export class SpendTracerAI {
  private static instance: SpendTracerAI | null = null;
  private tokenizer: Tokenizer;
  private modelLoader: ModelLoader;

  private constructor(vocabContent?: string) {
    this.tokenizer = Tokenizer.getInstance(vocabContent);
    this.modelLoader = ModelLoader.getInstance();
  }

  public static getInstance(vocabContent?: string): SpendTracerAI {
    if (!SpendTracerAI.instance) {
      SpendTracerAI.instance = new SpendTracerAI(vocabContent);
    }
    return SpendTracerAI.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.modelLoader.isLoaded()) {
      await this.modelLoader.initialize();
    }
  }

  public async processSMS(smsText: string, mode: ProcessingMode = ProcessingMode.LIVE, sender: string = ''): Promise<SpendTracerAIOutput> {
    console.log(`\n[SpendTracerAI] Processing SMS... Mode: ${mode}, Sender: ${sender}`);

    // Step 1: Tokenizer
    const tokenized = this.tokenizer.tokenize(smsText);

    // Step 2: Shared Encoder simulation / TFLite forward pass
    const dummyPooled = new Float32Array(512);
    const dummySeq = new Float32Array(128 * 512);

    // Step 3: Stage 1 SMS Classification
    const clsResult: ClassificationResult = SMSClassifier.classify(dummyPooled, smsText);

    console.log(`[STAGE 1] Called: true`);
    console.log(`[STAGE 1] Body: ${smsText}`);
    console.log(`[STAGE 1] Prediction: ${clsResult.predictedClass}`);
    console.log(`[STAGE 1] Confidence: ${clsResult.confidence}`);

    let isTxn = clsResult.isTransaction;

    // Confidence Threshold
    if (isTxn && clsResult.confidence < 0.90) {
      isTxn = false;
      console.log(`[STAGE 1] Rejected: Confidence ${clsResult.confidence} < 0.90`);
    }

    // Stage 1 basic filtering is done by SMSClassifier.
    // Further promotional validation will happen after entity extraction.

    console.log(`[STAGE 1] Accepted: ${isTxn}`);

    if (!isTxn) {
      return {
        isTransaction: false,
        confidence: clsResult.confidence,
        amount: null,
        currency: null,
        merchant: null,
        bank: null,
        accountSuffix: null,
        paymentMode: null,
        transactionType: 'Debit',
        reference: null,
        date: null,
        category: null,
        categoryConfidence: 0,
        originalSMS: smsText,
        needsVerification: false,
      };
    }

    // Step 4: Stage 2 Financial NER
    const nerPredictions: NERTokenPrediction[] = FinancialNER.predict(
      dummySeq,
      tokenized.tokens,
      tokenized.offsets,
      smsText
    );

    // Step 5: Entity Reconstruction
    const entities: ExtractedEntities = EntityReconstruction.reconstruct(
      nerPredictions,
      smsText
    );

    // Step 6: Stage 3 Expense Category Classification
    const categoryResult: ExpenseCategoryResult = await ExpenseClassifier.classify(
      dummyPooled,
      entities.merchant,
      smsText,
      undefined,
      sender,
      entities.bank
    );

    if (categoryResult.isLearned && categoryResult.learnedMerchant && (!entities.merchant || entities.merchant === 'Unknown Merchant')) {
      entities.merchant = categoryResult.learnedMerchant;
    }


    console.log(`[DATE_PIPELINE] 3. Normalized date in AI output: ${entities.date}`);

    // --- PROMOTION TRANSACTION VALIDATOR ---
    const promoResult = PromotionTransactionValidator.validate(smsText, entities.amount, sender);
    let isValid = promoResult.isValid;
    let rejectReason = promoResult.reason;
    let promoConfidence = promoResult.confidence;

    // --- TRANSACTION VALIDATOR ---
    if (isValid) {
      const txnResult = TransactionValidator.validate(entities, categoryResult, smsText);
      isValid = txnResult.isValid;
      rejectReason = txnResult.reason;
    }

    if (!isValid) {
      console.log(`\n[VALIDATION_REJECTED]`);
      console.log(`SMS body: ${smsText}`);
      console.log(`Extracted amount: ${entities.amount}`);
      console.log(`Merchant: ${entities.merchant || 'Unknown Merchant'}`);
      console.log(`Reason: ${rejectReason}\n`);
      
      return {
        isTransaction: false,
        confidence: 0,
        amount: null,
        currency: null,
        merchant: null,
        bank: null,
        accountSuffix: null,
        paymentMode: null,
        transactionType: 'Debit',
        reference: null,
        date: null,
        category: null,
        categoryConfidence: 0,
        originalSMS: smsText,
        needsVerification: false,
      };
    }

    let finalConfidence = categoryResult.isLearned 
      ? 1.0 
      : Math.round((clsResult.confidence * categoryResult.confidence * promoConfidence) * 100) / 100;
    
    let needsVerification = false;
    let finalStatus = StatusDetector.determineStatus(smsText);

    // If failed or reversed, it does not need manual category verification.
    if (finalStatus === 'FAILED' || finalStatus === 'REVERSED') {
      needsVerification = false;
    } else if (categoryResult.isLearned || categoryResult.confidence === 1.0) {
      // Confirmed user-learned category -> NEVER send to Pending Verification!
      needsVerification = false;
      finalConfidence = 1.0;
    } else {
      // Apply confidence threshold for unlearned transactions
      if (
        finalConfidence < 0.80 || 
        categoryResult.category === 'Unknown' || 
        categoryResult.category === 'Others' ||
        !entities.merchant ||
        entities.merchant === 'Unknown Merchant'
      ) {
        needsVerification = true;
      }
    }

    // Final Transaction Object
    return {
      isTransaction: true,
      confidence: finalConfidence,
      amount: entities.amount,
      currency: entities.currency,
      merchant: entities.merchant,
      bank: entities.bank,
      accountSuffix: entities.accountSuffix,
      paymentMode: entities.paymentMode,
      transactionType: entities.transactionType,
      reference: entities.reference,
      date: entities.date,
      category: categoryResult.category,
      categoryConfidence: categoryResult.confidence,
      aiCategory: categoryResult.category,
      aiConfidence: finalConfidence,
      originalSMS: smsText,
      needsVerification: needsVerification,
      status: finalStatus,
    };
  }
}

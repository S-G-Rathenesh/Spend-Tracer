# React Native AI Integration Document

## Overview
SpendGuard AI mobile inference engine is fully integrated into the React Native application. It operates **100% offline** on-device using mobile-optimized float16 TensorFlow Lite models and pure TypeScript tokenization/reconstruction modules.

## Architecture & Module Structure

```
src/ai/
 ├── SpendGuardAI.ts           # Core 3-stage pipeline orchestrator
 ├── ModelLoader.ts            # Singleton loader & TFLite interpreter reuse
 ├── Tokenizer.ts              # MobileBERT WordPiece tokenizer (uncased, max len 128)
 ├── SMSClassifier.ts          # Stage 1: Transaction vs Personal vs Promo vs Scam
 ├── FinancialNER.ts           # Stage 2: 19 BIO label sequence prediction
 ├── EntityReconstruction.ts   # Exact character span extraction
 ├── ExpenseClassifier.ts      # Stage 3: Category prediction (EMI, Food, Investment, Shopping, Travel)
 └── Benchmark.ts              # Telemetry & performance tracker
```

## Key Capabilities
1. **One-Time Model Loading**: `ModelLoader` initializes interpreters once during app boot (16.04 ms setup), preventing memory leaks.
2. **Headless SMS Listener**: `SmsReceiver.java` -> `SmsTaskService.java` -> `SMSListener.ts` -> `SMSService.processIncoming()` for automated background processing.
3. **SQLite Persistence**: Verified transactions are saved to `Transactions` table with confidence scores.
4. **Duplicate Safeguard**: `TransactionRepository.existsByReferenceOrDetails()` prevents duplicate entries.
5. **Dashboard State Update**: Live subscription triggers instant UI updates upon transaction entry.

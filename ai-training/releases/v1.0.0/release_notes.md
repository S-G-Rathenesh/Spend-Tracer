# Release Notes - SpendGuard AI v1.0.0

## Release Summary
- **Architecture**: Shared MobileBERT Backbone + Classification Head + NER Head + Expense MLP
- **Target Platform**: Android (Min SDK 26)
- **Format**: PyTorch Checkpoints & TFLite Export Ready
- **Dataset Versions**:
  - SMS Classification: `v2.0`
  - Financial NER: `v2.1`
  - Expense Category: `v1.0`

## Initial Release Features
- Shared MobileBERT encoder processing text tokenization once.
- 4-Class SMS Classification (`Transaction`, `Personal`, `Promotion`, `Scam`).
- 9-Entity Financial Named Entity Recognition.
- 6-Class Expense Categorization MLP.

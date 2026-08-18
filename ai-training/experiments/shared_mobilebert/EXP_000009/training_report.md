# Training Report - EXP_000009

## Experiment Summary
- **Model**: `google/mobilebert-uncased`
- **Experiment ID**: `EXP_000009`
- **Status**: `Completed`
- **Dataset Version**: `v2.0`
- **Created At**: `2026-07-27T17:13:53.296577Z`
- **Completed At**: `2026-07-27T17:28:12.727369Z`
- **Best Checkpoint**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\checkpoints\ner_head\best.pt`

## Hyperparameters
- **Backbone**: `google/mobilebert-uncased`
- **Learning Rate**: `2e-05`
- **Batch Size**: `16`
- **Epochs**: `10`
- **Random Seed**: `42`

## Final Metrics
```json
{
  "entity_precision": 100.0,
  "entity_recall": 100.0,
  "entity_f1": 100.0,
  "token_precision": 100.0,
  "token_recall": 100.0,
  "token_f1": 100.0,
  "test_samples": 100,
  "best_epoch": 10,
  "training_time_sec": 856.09,
  "per_entity_f1": {
    "AMOUNT": 100.0,
    "CURRENCY": 100.0,
    "BANK": 100.0,
    "MERCHANT": 100.0,
    "TRANSACTION_TYPE": 100.0,
    "MODE": 100.0,
    "DATE": 100.0,
    "REFERENCE": 100.0,
    "ACCOUNT_SUFFIX": 100.0
  }
}
```

## System Environment
- **Git Commit**: `cfff19068847dca479a07926e062f1775936cdb9`
- **Python**: `3.12.10`
- **PyTorch**: `2.6.0+cpu`
- **Transformers**: `4.49.0`
- **OS**: `Windows-11-10.0.26200-SP0`

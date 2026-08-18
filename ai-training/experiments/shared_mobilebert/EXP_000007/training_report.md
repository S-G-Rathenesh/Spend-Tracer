# Training Report - EXP_000007

## Experiment Summary
- **Model**: `google/mobilebert-uncased`
- **Experiment ID**: `EXP_000007`
- **Status**: `Completed`
- **Dataset Version**: `v2.0`
- **Created At**: `2026-07-27T14:31:16.510277Z`
- **Completed At**: `2026-07-27T16:46:23.836762Z`
- **Best Checkpoint**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\checkpoints\classification_head\best.pt`

## Hyperparameters
- **Backbone**: `google/mobilebert-uncased`
- **Learning Rate**: `2e-5`
- **Batch Size**: `16`
- **Epochs**: `8`
- **Random Seed**: `42`

## Final Metrics
```json
{
  "classification_accuracy": 97.45,
  "classification_precision": 97.43,
  "classification_recall": 97.45,
  "classification_macro_f1": 96.63,
  "classification_weighted_f1": 97.44,
  "test_samples": 1295,
  "best_epoch": 4,
  "training_time_sec": 8029.22,
  "class_weights": {
    "Transaction": 1.7381,
    "Personal": 0.4042,
    "Promotion": 1.6558,
    "Scam": 2.8852
  }
}
```

## System Environment
- **Git Commit**: `cfff19068847dca479a07926e062f1775936cdb9`
- **Python**: `3.12.10`
- **PyTorch**: `2.6.0+cpu`
- **Transformers**: `4.49.0`
- **OS**: `Windows-11-10.0.26200-SP0`

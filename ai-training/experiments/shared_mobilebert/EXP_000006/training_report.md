# Training Report - EXP_000006

## Experiment Summary
- **Model**: `google/mobilebert-uncased`
- **Experiment ID**: `EXP_000006`
- **Status**: `Completed`
- **Dataset Version**: `v2.0`
- **Created At**: `2026-07-26T18:28:36.202589Z`
- **Completed At**: `2026-07-26T19:46:00.209409Z`
- **Best Checkpoint**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\checkpoints\classification_head\best.pt`

## Hyperparameters
- **Backbone**: `google/mobilebert-uncased`
- **Learning Rate**: `3e-5`
- **Batch Size**: `32`
- **Epochs**: `5`
- **Random Seed**: `42`

## Final Metrics
```json
{
  "classification_accuracy": 97.37,
  "classification_precision": 97.49,
  "classification_recall": 97.37,
  "classification_macro_f1": 96.65,
  "classification_weighted_f1": 97.41,
  "test_samples": 1295,
  "best_epoch": 3,
  "training_time_sec": 4576.71
}
```

## System Environment
- **Git Commit**: `cfff19068847dca479a07926e062f1775936cdb9`
- **Python**: `3.12.10`
- **PyTorch**: `2.6.0+cpu`
- **Transformers**: `4.49.0`
- **OS**: `Windows-11-10.0.26200-SP0`

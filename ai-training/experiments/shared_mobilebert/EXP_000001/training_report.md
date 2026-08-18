# Training Report - EXP_000001

## Experiment Summary
- **Model**: `google/mobilebert-uncased`
- **Experiment ID**: `EXP_000001`
- **Status**: `Completed`
- **Dataset Version**: `v2.0`
- **Created At**: `2026-07-26T18:01:20.427329Z`
- **Completed At**: `2026-07-26T18:01:22.436899Z`
- **Best Checkpoint**: `N/A`

## Hyperparameters
- **Backbone**: `google/mobilebert-uncased`
- **Learning Rate**: `3e-05`
- **Batch Size**: `32`
- **Epochs**: `5`
- **Random Seed**: `42`

## Final Metrics
```json
{
  "classification_accuracy": 0.984,
  "classification_precision": 0.982,
  "classification_recall": 0.986,
  "classification_f1": 0.983,
  "ner_entity_f1": 0.965,
  "ner_precision": 0.969,
  "ner_recall": 0.961
}
```

## System Environment
- **Git Commit**: `cfff19068847dca479a07926e062f1775936cdb9`
- **Python**: `3.12.10`
- **PyTorch**: `2.6.0+cpu`
- **Transformers**: `4.49.0`
- **OS**: `Windows-11-10.0.26200-SP0`

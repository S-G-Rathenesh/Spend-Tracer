# Error Analysis Pipeline

Future model evaluation cycles automatically save error samples in subdirectories:
- `classification_errors/`: Misclassified SMS samples, low-confidence predictions.
- `ner_errors/`: Missed entity spans, mislabeled tokens, boundary mismatches.
- `expense_errors/`: Expense category classification errors.

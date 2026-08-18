# Expense Category Classifier

This module contains the independent lightweight neural network (MLP) that classifies structured transaction data into one of the 6 core expense categories:
- Food
- Shopping
- Travel
- Bills
- Investment
- Others

## Feature Preprocessing & Vectorization
Raw string entities (Merchant, Bank, Mode, Transaction Type, Amount) from the NER output cannot be passed as raw strings into the MLP.

### Numerical Conversion Pipeline (Documentation & TODOs):
1. **Categorical Encoding**:
   - `Merchant`: Convert string via TF-IDF Vectorizer or Target Encoding.
   - `Bank`, `Mode`, `Transaction Type`: Encode via One-Hot Encoding.
2. **Amount Normalization**:
   - `Amount`: Apply log-transform `log1p(amount)` and scale via `StandardScaler`.
3. **Dense Feature Vector**:
   - Concatenate all numerical sub-vectors into a single dense 1D float tensor of dimension `input_features`.

> **TODO Placeholder**: Implement automated `feature_vectorizer.py` transformation prior to final model training.

## Model Configuration & Labels
- Parameters are loaded dynamically from `configs/expense_classifier.yaml`.
- Category labels are loaded dynamically from `configs/expense_labels.json`.

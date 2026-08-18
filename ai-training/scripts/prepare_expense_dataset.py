import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def prepare_expense_dataset():
    raw_dir = os.path.join(base_dir, 'datasets', 'raw', 'expense_category')
    processed_dir = os.path.join(base_dir, 'datasets', 'processed', 'expense_category')
    train_dir = os.path.join(base_dir, 'datasets', 'train', 'expense_category')
    val_dir = os.path.join(base_dir, 'datasets', 'validation', 'expense_category')
    test_dir = os.path.join(base_dir, 'datasets', 'test', 'expense_category')

    for d in [processed_dir, train_dir, val_dir, test_dir]:
        os.makedirs(d, exist_ok=True)

    raw_train_path = os.path.join(raw_dir, 'financial_transaction_train.csv')
    raw_test_path = os.path.join(raw_dir, 'financial_transaction_test.csv')

    df_train_raw = pd.read_csv(raw_train_path)
    df_test_raw = pd.read_csv(raw_test_path)

    df_combined = pd.concat([df_train_raw, df_test_raw], ignore_index=True)

    # Rename columns to standard names
    df_combined.columns = ['text', 'label']

    # Clean text & label
    df_combined['text'] = df_combined['text'].astype(str).str.strip()
    df_combined['label'] = df_combined['label'].astype(str).str.strip()

    # Drop empty and invalid rows
    df_combined = df_combined[df_combined['text'] != ""]
    df_combined = df_combined[df_combined['label'] != ""]
    
    # Remove duplicates
    initial_len = len(df_combined)
    df_combined.drop_duplicates(subset=['text'], keep='first', inplace=True)
    dedup_len = len(df_combined)

    # Export combined processed CSV
    processed_csv = os.path.join(processed_dir, 'expense_category.csv')
    df_combined.to_csv(processed_csv, index=False)

    # Stratified Train (80%) / Val (10%) / Test (10%) split
    train_df, test_val_df = train_test_split(
        df_combined, test_size=0.20, random_state=42, stratify=df_combined['label']
    )
    val_df, test_df = train_test_split(
        test_val_df, test_size=0.50, random_state=42, stratify=test_val_df['label']
    )

    # Save to train/val/test splits
    train_df.to_csv(os.path.join(train_dir, 'dataset.csv'), index=False)
    val_df.to_csv(os.path.join(val_dir, 'dataset.csv'), index=False)
    test_df.to_csv(os.path.join(test_dir, 'dataset.csv'), index=False)

    print("==================================================")
    print("EXPENSE CATEGORY DATASET PREPARATION SUMMARY")
    print("==================================================")
    print(f"Raw Input Samples:      {initial_len} (Train: {len(df_train_raw)}, Test: {len(df_test_raw)})")
    print(f"Deduplicated Samples:   {dedup_len} (Removed {initial_len - dedup_len} duplicates)")
    print(f"Train Split (80%):      {len(train_df)} samples -> {os.path.join(train_dir, 'dataset.csv')}")
    print(f"Validation Split (10%): {len(val_df)} samples -> {os.path.join(val_dir, 'dataset.csv')}")
    print(f"Test Split (10%):       {len(test_df)} samples -> {os.path.join(test_dir, 'dataset.csv')}")
    print("\nClass Distribution Across Splits:")
    dist_df = pd.DataFrame({
        'Train': train_df['label'].value_counts(),
        'Val': val_df['label'].value_counts(),
        'Test': test_df['label'].value_counts(),
        'Total': df_combined['label'].value_counts()
    })
    print(dist_df)
    print("==================================================")

if __name__ == "__main__":
    prepare_expense_dataset()

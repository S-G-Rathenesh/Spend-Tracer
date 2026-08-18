import os
import pandas as pd
import re

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    # Basic cleanup: remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_expense_category():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'datasets', 'raw', 'expense_category')
    processed_dir = os.path.join(base_dir, 'datasets', 'processed')
    
    os.makedirs(processed_dir, exist_ok=True)
    
    # Files
    train_path = os.path.join(raw_dir, 'financial_transaction_train.csv')
    test_path = os.path.join(raw_dir, 'financial_transaction_test.csv')
    
    dfs = []
    
    # Load files assuming no headers based on inspection
    if os.path.exists(train_path):
        df_train = pd.read_csv(train_path, header=None, names=['text', 'label'])
        dfs.append(df_train)
    else:
        print(f"Warning: {train_path} not found.")
        
    if os.path.exists(test_path):
        df_test = pd.read_csv(test_path, header=None, names=['text', 'label'])
        dfs.append(df_test)
    else:
        print(f"Warning: {test_path} not found.")
        
    if not dfs:
        print("Error: No datasets found in raw/expense_category/")
        return
        
    df_combined = pd.concat(dfs, ignore_index=True)
    
    # Clean up
    df_combined['text'] = df_combined['text'].apply(clean_text)
    df_combined['label'] = df_combined['label'].str.strip()
    
    # Remove empty text and headers
    df_combined = df_combined[df_combined['text'] != ""]
    df_combined = df_combined[df_combined['label'].str.lower() != "label"]
    
    # Drop duplicates
    df_combined.drop_duplicates(subset=['text'], keep='first', inplace=True)
    
    output_path = os.path.join(processed_dir, 'expense_category.csv')
    df_combined.to_csv(output_path, index=False)
    
    print(f"Processed expense_category dataset. Total rows: {len(df_combined)}")
    print("Label distribution:")
    print(df_combined['label'].value_counts())

if __name__ == "__main__":
    process_expense_category()

import os
import pandas as pd
import re
import json

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    # Remove corrupted characters (non-ascii)
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_pipeline():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'datasets', 'raw')
    processed_dir = os.path.join(base_dir, 'datasets', 'processed')
    final_dir = os.path.join(base_dir, 'datasets', 'final')
    
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(final_dir, exist_ok=True)
    
    stats = {}

    # 1. Process Bank Dataset
    bank_path = os.path.join(raw_dir, 'Prepared bank transactions SMS dataset .xlsx')
    df_bank = pd.read_excel(bank_path)
    initial_bank_len = len(df_bank)
    
    # We only need the SMS column
    if 'SMS' in df_bank.columns:
        df_bank = df_bank[['SMS']].copy()
        df_bank.rename(columns={'SMS': 'text'}, inplace=True)
    else:
        # Fallback if column name differs
        df_bank = df_bank.iloc[:, -1:].copy()
        df_bank.columns = ['text']
        
    df_bank['label'] = 'transaction'
    
    # Clean text
    df_bank['text'] = df_bank['text'].apply(clean_text)
    
    # Remove invalid rows (empty messages)
    df_bank = df_bank[df_bank['text'] != ""]
    invalid_bank = initial_bank_len - len(df_bank)
    
    # Remove duplicates
    len_before_dedup = len(df_bank)
    df_bank.drop_duplicates(subset=['text'], inplace=True)
    duplicates_bank = len_before_dedup - len(df_bank)
    
    # Save processed bank dataset
    bank_processed_path = os.path.join(processed_dir, 'bank_transactions.csv')
    df_bank.to_csv(bank_processed_path, index=False, columns=['text', 'label'])
    
    # 2. Process SMSSpamCollection
    sms_path = os.path.join(raw_dir, 'SMSSpamCollection')
    df_sms = pd.read_csv(sms_path, sep='\t', header=None, names=['label', 'text'])
    initial_sms_len = len(df_sms)
    
    # Clean text
    df_sms['text'] = df_sms['text'].apply(clean_text)
    
    # Remove invalid rows
    df_sms = df_sms[(df_sms['text'] != "") & (df_sms['label'].notna())]
    invalid_sms = initial_sms_len - len(df_sms)
    
    # Remove duplicates
    len_before_dedup = len(df_sms)
    df_sms.drop_duplicates(subset=['text'], inplace=True)
    duplicates_sms = len_before_dedup - len(df_sms)
    
    # Remap labels
    df_sms['label'] = df_sms['label'].map({'ham': 'personal', 'spam': 'scam'})
    df_sms = df_sms.dropna(subset=['label']) # Drop any rows that weren't ham or spam
    
    # Split and save
    df_personal = df_sms[df_sms['label'] == 'personal'].copy()
    df_scam = df_sms[df_sms['label'] == 'scam'].copy()
    
    df_personal.to_csv(os.path.join(processed_dir, 'personal_messages.csv'), index=False, columns=['text', 'label'])
    df_scam.to_csv(os.path.join(processed_dir, 'scam_messages.csv'), index=False, columns=['text', 'label'])
    
    # 3. Final Merge
    df_final = pd.concat([df_bank, df_personal, df_scam], ignore_index=True)
    
    # Shuffle (optional, but requested simple generation)
    # df_final = df_final.sample(frac=1).reset_index(drop=True)
    
    final_path = os.path.join(final_dir, 'classification.csv')
    df_final.to_csv(final_path, index=False, columns=['text', 'label'])
    
    # 4. Compile Statistics
    stats['rows_removed_invalid'] = invalid_bank + invalid_sms
    stats['duplicates_removed'] = duplicates_bank + duplicates_sms
    stats['messages_per_class'] = df_final['label'].value_counts().to_dict()
    
    # Average length
    avg_lengths = df_final.copy()
    avg_lengths['length'] = avg_lengths['text'].apply(len)
    stats['average_length_per_class'] = avg_lengths.groupby('label')['length'].mean().round(2).to_dict()
    
    stats['final_dataset_size'] = len(df_final)
    
    stats_out = os.path.join(base_dir, 'datasets', 'statistics', 'preprocessing_stats.json')
    with open(stats_out, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=4)
        
    print("Preprocessing completed.")
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    process_pipeline()

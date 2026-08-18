import os
import pandas as pd
from sklearn.model_selection import train_test_split

def split_sms_classification_dataset():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'datasets', 'processed', 'sms_classification', 'classification.csv')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} total SMS classification samples.")
    
    # 80% train, 10% val, 10% test with stratified splitting
    train_df, temp_df = train_test_split(df, test_size=0.20, random_state=42, stratify=df['label'])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df['label'])
    
    dirs = {
        'train': train_df,
        'validation': val_df,
        'test': test_df
    }
    
    for split_name, split_df in dirs.items():
        out_dir = os.path.join(base_dir, 'datasets', split_name, 'sms_classification')
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'dataset.csv')
        split_df.to_csv(out_path, index=False)
        print(f"Saved {len(split_df)} samples to {out_path}")
        print(split_df['label'].value_counts().to_dict())

if __name__ == "__main__":
    split_sms_classification_dataset()

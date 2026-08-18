import os
import pandas as pd
from dataset_validator import validate_dataset, load_dataset

def merge_datasets(base_dataset_path, new_dataset_path, output_path):
    print(f"Validating new dataset: {new_dataset_path}")
    validation = validate_dataset(new_dataset_path)
    
    if "error" in validation:
        print(f"Merge failed: {validation['error']}")
        return False
        
    print(f"Validation results: {validation}")
    
    df_base = pd.read_csv(base_dataset_path)
    df_new = load_dataset(new_dataset_path)
    
    # Standardize columns
    df_new.columns = [str(c).lower() for c in df_new.columns]
    if 'text' not in df_new.columns or 'label' not in df_new.columns:
        print("Error: new dataset must have 'text' and 'label' columns.")
        return False
        
    df_new = df_new[['text', 'label']].copy()
    
    # Basic cleaning before merge
    df_new['label'] = df_new['label'].str.lower()
    df_new = df_new.dropna(subset=['text', 'label'])
    df_new = df_new[df_new['text'].str.strip() != ""]
    
    df_combined = pd.concat([df_base, df_new], ignore_index=True)
    df_combined.drop_duplicates(subset=['text'], keep='first', inplace=True)
    
    df_combined.to_csv(output_path, index=False)
    print(f"Successfully merged. Saved to {output_path}. Total rows: {len(df_combined)}")
    return True

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 4:
        merge_datasets(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python dataset_merger.py <base_csv> <new_dataset> <output_csv>")

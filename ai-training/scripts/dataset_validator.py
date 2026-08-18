import os
import pandas as pd
import json

VALID_LABELS = {'transaction', 'scam', 'promotion', 'personal'}

def load_dataset(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.csv':
        try:
            return pd.read_csv(filepath, encoding='utf-8')
        except UnicodeDecodeError:
            return pd.read_csv(filepath, encoding='latin-1')
    elif ext in ['.xls', '.xlsx']:
        return pd.read_excel(filepath)
    elif ext in ['.tsv', '.txt']:
        try:
            return pd.read_csv(filepath, sep='\t', header=None, names=['label', 'text'])
        except Exception:
            return pd.read_csv(filepath, sep='\t')
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def check_encoding(text):
    if pd.isna(text):
        return False
    try:
        str(text).encode('ascii')
        return False
    except UnicodeEncodeError:
        return True

def validate_dataset(filepath):
    df = load_dataset(filepath)
    
    # Ensure text and label columns exist
    if 'text' not in df.columns or 'label' not in df.columns:
        # Try to fallback heuristics
        cols = [c.lower() for c in df.columns]
        if 'text' in cols and 'label' in cols:
            df.columns = [c.lower() for c in df.columns]
        else:
            return {"error": "Dataset must contain 'text' and 'label' columns for validation."}
            
    validation_results = {
        "total_rows": len(df),
        "duplicates": int(df.duplicated(subset=['text']).sum()),
        "missing_labels": int(df['label'].isna().sum()),
        "invalid_labels": int((~df['label'].str.lower().isin(VALID_LABELS) & df['label'].notna()).sum()),
        "empty_messages": int((df['text'].isna() | (df['text'].str.strip() == '')).sum()),
        "encoding_problems": int(df['text'].apply(check_encoding).sum()),
        "very_short_messages": int(df['text'].dropna().astype(str).str.len().lt(3).sum())
    }
    
    return validation_results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = validate_dataset(sys.argv[1])
        print(json.dumps(res, indent=2))

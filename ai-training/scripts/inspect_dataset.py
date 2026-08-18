import os
import pandas as pd
import json

def load_dataset(filepath):
    """Attempt to load a dataset intelligently based on its extension."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.csv':
        try:
            return pd.read_csv(filepath, encoding='utf-8')
        except UnicodeDecodeError:
            return pd.read_csv(filepath, encoding='latin-1')
    elif ext == '.xlsx':
        return pd.read_excel(filepath)
    else:
        # Default for things like SMSSpamCollection which is TSV
        try:
            return pd.read_csv(filepath, sep='\t', header=None, names=['label', 'text'])
        except Exception:
            return pd.read_csv(filepath, sep='\t', header=None)

def guess_columns(df):
    """Guess which column is text and which is label for statistics."""
    text_col = None
    label_col = None
    cols = [str(c).lower() for c in df.columns]
    
    # Heuristics for label
    for c in df.columns:
        cl = str(c).lower()
        if 'label' in cl or cl == 'v1' or cl == 'class' or cl == 'category':
            label_col = c
            break
            
    # Heuristics for text
    for c in df.columns:
        cl = str(c).lower()
        if c == label_col:
            continue
        if 'text' in cl or 'message' in cl or 'sms' in cl or cl == 'v2' or cl == 'body' or 'snippet' in cl:
            text_col = c
            break
            
    return text_col, label_col

def inspect_dataset(filepath, output_dir):
    print(f"Inspecting {filepath}...")
    filename = os.path.basename(filepath)
    df = load_dataset(filepath)
    
    num_rows = len(df)
    columns = list(df.columns)
    missing_values = df.isnull().sum().to_dict()
    
    # Try to calculate duplicates based on all columns or specific text column
    duplicates = int(df.duplicated().sum())
    
    text_col, label_col = guess_columns(df)
    
    unique_labels = []
    if label_col and label_col in df.columns:
        unique_labels = df[label_col].dropna().unique().tolist()
        
    avg_length = 0
    if text_col and text_col in df.columns:
        lengths = df[text_col].dropna().astype(str).apply(len)
        if len(lengths) > 0:
            avg_length = float(lengths.mean())
            
    stats = {
        "filename": filename,
        "number_of_rows": num_rows,
        "columns": [str(c) for c in columns],
        "missing_values": {str(k): int(v) for k, v in missing_values.items()},
        "duplicate_rows": duplicates,
        "unique_labels": [str(x) for x in unique_labels],
        "average_message_length": round(avg_length, 2)
    }
    
    out_path = os.path.join(output_dir, f"{filename}_stats.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=4)
        
    return stats

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'datasets', 'raw')
    stats_dir = os.path.join(base_dir, 'datasets', 'statistics')
    
    os.makedirs(stats_dir, exist_ok=True)
    
    if not os.path.exists(raw_dir):
        print(f"Raw directory not found: {raw_dir}")
        return
        
    for file in os.listdir(raw_dir):
        filepath = os.path.join(raw_dir, file)
        if os.path.isfile(filepath):
            inspect_dataset(filepath, stats_dir)
            
    print("Inspection complete. Statistics saved to datasets/statistics/")

if __name__ == "__main__":
    main()

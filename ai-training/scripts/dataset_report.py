import pandas as pd
import json

def generate_report(filepath):
    df = pd.read_csv(filepath)
    
    if 'text' not in df.columns or 'label' not in df.columns:
        return {"error": "Dataset must contain 'text' and 'label' columns."}
        
    df['text'] = df['text'].astype(str)
    
    class_distribution = df['label'].value_counts().to_dict()
    label_dist_pct = df['label'].value_counts(normalize=True).mul(100).round(2).to_dict()
    
    avg_length = df.groupby('label')['text'].apply(lambda x: x.str.len().mean()).round(2).to_dict()
    
    duplicates = int(df.duplicated(subset=['text']).sum())
    
    # Vocabulary size estimation (simple whitespace split)
    all_words = ' '.join(df['text'].tolist()).lower().split()
    vocab_size = len(set(all_words))
    
    report = {
        "dataset": filepath,
        "total_messages": len(df),
        "class_distribution": class_distribution,
        "label_distribution_percentage": label_dist_pct,
        "average_length_per_class": avg_length,
        "duplicates": duplicates,
        "vocabulary_size": vocab_size
    }
    
    return report

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        rep = generate_report(sys.argv[1])
        print(json.dumps(rep, indent=2))
    else:
        print("Usage: python dataset_report.py <csv_file>")

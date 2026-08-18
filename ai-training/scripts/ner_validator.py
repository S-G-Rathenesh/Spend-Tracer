import os
import pandas as pd
import json

VALID_LABELS = {
    'AMOUNT', 'CURRENCY', 'BANK', 'MERCHANT', 'TRANSACTION_TYPE', 
    'MODE', 'REFERENCE', 'ACCOUNT_SUFFIX', 'DATE'
}

def parse_entities_string(entities_str):
    """
    Parses 'Rs. -> CURRENCY; 399 -> AMOUNT' into a list of dicts.
    """
    if pd.isna(entities_str) or not str(entities_str).strip():
        return []
    
    parsed = []
    pairs = str(entities_str).split(';')
    for pair in pairs:
        pair = pair.strip()
        if not pair:
            continue
        if '->' not in pair:
            return None # Malformed
        parts = pair.split('->')
        if len(parts) != 2:
            return None # Malformed
        
        ent_text = parts[0].strip()
        ent_label = parts[1].strip().upper()
        parsed.append({'text': ent_text, 'label': ent_label})
    return parsed

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'datasets', 'raw', 'ner', 'ner_transaction_sms_v2.csv')
    output_path = os.path.join(base_dir, 'datasets', 'processed', 'ner', 'validated_ner.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    try:
        df = pd.read_csv(input_path, encoding='utf-8')
    except Exception as e:
        print(f"Failed to read as UTF-8: {e}")
        return
        
    stats = {
        "Total Rows Read": len(df),
        "Missing SMS": 0,
        "Missing Entities": 0,
        "Duplicate SMS": 0,
        "Malformed Entity Strings": 0,
        "Unknown Labels Rejected": 0,
        "Entity Span Mismatches": 0,
        "Valid SMS Retained": 0
    }
    
    # 1. Drop missing SMS
    missing_sms_mask = df['SMS'].isna() | (df['SMS'].astype(str).str.strip() == "")
    stats["Missing SMS"] = int(missing_sms_mask.sum())
    df = df[~missing_sms_mask]
    
    # 2. Drop duplicates
    dup_mask = df.duplicated(subset=['SMS'])
    stats["Duplicate SMS"] = int(dup_mask.sum())
    df = df[~dup_mask]
    
    # 3. Missing Entities
    missing_ent_mask = df['Entities'].isna() | (df['Entities'].astype(str).str.strip() == "")
    stats["Missing Entities"] = int(missing_ent_mask.sum())
    df = df[~missing_ent_mask]
    
    valid_data = []
    
    for idx, row in df.iterrows():
        sms_text = str(row['SMS']).strip()
        entities_str = str(row['Entities']).strip()
        
        parsed = parse_entities_string(entities_str)
        if parsed is None:
            stats["Malformed Entity Strings"] += 1
            continue
            
        has_invalid_label = False
        has_span_mismatch = False
        
        for ent in parsed:
            if ent['label'] not in VALID_LABELS:
                has_invalid_label = True
                stats["Unknown Labels Rejected"] += 1
                break
            
            if ent['text'] not in sms_text:
                has_span_mismatch = True
                stats["Entity Span Mismatches"] += 1
                break
                
        if has_invalid_label or has_span_mismatch:
            continue
            
        # If all good, store
        valid_data.append({
            "text": sms_text,
            "entities": parsed
        })
        
    stats["Valid SMS Retained"] = len(valid_data)
    
    print("=== NER Validation Report ===")
    print(json.dumps(stats, indent=2))
    
    # Ensure processed dir exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(valid_data, f, indent=2)
        
if __name__ == "__main__":
    main()

import os
import json
from collections import Counter

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'datasets', 'processed', 'ner', 'validated_ner.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    total_sms = len(data)
    
    entity_freq = Counter()
    total_entities = 0
    total_sms_len = 0
    total_ent_len = 0
    
    banks = set()
    merchants = set()
    modes = set()
    
    all_entity_texts = []
    
    for item in data:
        text = item['text']
        entities = item['entities']
        
        total_sms_len += len(text)
        total_entities += len(entities)
        
        for ent in entities:
            lbl = ent['label']
            txt = ent['text']
            
            entity_freq[lbl] += 1
            total_ent_len += len(txt)
            all_entity_texts.append(txt)
            
            if lbl == 'BANK':
                banks.add(txt)
            elif lbl == 'MERCHANT':
                merchants.add(txt)
            elif lbl == 'MODE':
                modes.add(txt)
                
    avg_entities_per_sms = round(total_entities / total_sms, 2) if total_sms > 0 else 0
    avg_sms_length = round(total_sms_len / total_sms, 2) if total_sms > 0 else 0
    avg_ent_length = round(total_ent_len / total_entities, 2) if total_entities > 0 else 0
    
    duplicate_entities = len(all_entity_texts) - len(set(all_entity_texts))
    
    stats = {
        "Total SMS": total_sms,
        "Entity Frequency": dict(entity_freq),
        "Average entities per SMS": avg_entities_per_sms,
        "Average SMS length": avg_sms_length,
        "Average entity length": avg_ent_length,
        "Unique banks": len(banks),
        "Unique merchants": len(merchants),
        "Unique payment modes": len(modes),
        "Duplicate entity strings": duplicate_entities
    }
    
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    main()

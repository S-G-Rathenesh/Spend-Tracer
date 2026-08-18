import os
import json
import random

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'datasets', 'processed', 'ner', 'validated_ner.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Shuffle for random split
    random.seed(42)
    random.shuffle(data)
    
    total = len(data)
    train_end = int(total * 0.8)
    val_end = train_end + int(total * 0.1)
    
    train_data = data[:train_end]
    val_data = data[train_end:val_end]
    test_data = data[val_end:]
    
    splits = {
        'train': train_data,
        'validation': val_data,
        'test': test_data
    }
    
    for split_name, split_data in splits.items():
        out_dir = os.path.join(base_dir, 'datasets', split_name, 'ner')
        os.makedirs(out_dir, exist_ok=True)
        out_file = os.path.join(out_dir, 'dataset.json')
        
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(split_data, f, indent=2)
            
    print("=== NER Dataset Splitter ===")
    print(f"Total: {total}")
    print(f"Train: {len(train_data)}")
    print(f"Validation: {len(val_data)}")
    print(f"Test: {len(test_data)}")

if __name__ == "__main__":
    main()

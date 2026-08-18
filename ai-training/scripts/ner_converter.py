import os
import json
import re

def tokenize(text):
    """
    Simple tokenizer that splits words and punctuation.
    Returns list of tuples: (token_string, start_char, end_char)
    """
    tokens = []
    for match in re.finditer(r'\w+|[^\w\s]', text):
        tokens.append((match.group(), match.start(), match.end()))
    return tokens

def align_entities(text, entities):
    """
    Finds char offsets for entities. 
    Assumes first occurrence or uses regex findall if multiple?
    For simplicity, finds first occurrence of exact string. 
    To be robust, it's better to find all and map the ones that don't overlap, 
    but for this dataset standard find is usually enough.
    """
    spans = []
    used_indices = set()
    
    # Sort entities by length descending to match longest first
    entities_sorted = sorted(entities, key=lambda x: len(x['text']), reverse=True)
    
    for ent in entities_sorted:
        ent_text = ent['text']
        ent_label = ent['label']
        
        # Find all occurrences
        start = 0
        while True:
            idx = text.find(ent_text, start)
            if idx == -1:
                break
            
            end = idx + len(ent_text)
            
            # Check overlap
            overlap = False
            for i in range(idx, end):
                if i in used_indices:
                    overlap = True
                    break
                    
            if not overlap:
                spans.append({'start': idx, 'end': end, 'label': ent_label, 'text': ent_text})
                for i in range(idx, end):
                    used_indices.add(i)
                break # Matched this entity
            
            start = idx + 1
            
    # Sort spans by start index
    return sorted(spans, key=lambda x: x['start'])

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'datasets', 'processed', 'ner', 'validated_ner.json')
    out_dir = os.path.join(base_dir, 'datasets', 'processed', 'ner')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    bio_lines = []
    iob2_lines = []
    spacy_data = []
    hf_data = []
    
    for item in data:
        text = item['text']
        entities = item['entities']
        
        # 1. Spacy format (char offsets)
        spans = align_entities(text, entities)
        
        # format: [text, {"entities": [(start, end, label)]}]
        spacy_ents = [[s['start'], s['end'], s['label']] for s in spans]
        spacy_data.append([text, {"entities": spacy_ents}])
        
        # 2. Tokenize for BIO / HF
        tokens = tokenize(text)
        
        hf_tokens = []
        hf_tags = []
        
        for tok_text, t_start, t_end in tokens:
            # Find if this token falls inside any span
            assigned_label = "O"
            is_start = False
            
            for s in spans:
                if t_start >= s['start'] and t_end <= s['end']:
                    # Inside this span
                    if t_start == s['start'] or (t_start > s['start'] and not any(t[1] == s['start'] for t in tokens if t[1] < t_start and t[1] >= s['start'])):
                        is_start = True
                    # Wait, a better way to check if it's the very first token of the span:
                    # It's the first token if there is no previous token that falls in this span.
                    # We can just track previous span ID.
                    assigned_label = s['label']
                    break
                    
            if assigned_label == "O":
                tag = "O"
            else:
                prefix = "B-" if is_start else "I-"
                tag = f"{prefix}{assigned_label}"
                
            hf_tokens.append(tok_text)
            hf_tags.append(tag)
            
            bio_lines.append(f"{tok_text}\t{tag}")
            iob2_lines.append(f"{tok_text}\t{tag}")
            
        bio_lines.append("")
        iob2_lines.append("")
        
        hf_data.append({
            "tokens": hf_tokens,
            "ner_tags": hf_tags
        })
        
    # Write BIO
    with open(os.path.join(out_dir, 'dataset.bio'), 'w', encoding='utf-8') as f:
        f.write("\n".join(bio_lines))
        
    # Write IOB2
    with open(os.path.join(out_dir, 'dataset.iob2'), 'w', encoding='utf-8') as f:
        f.write("\n".join(iob2_lines))
        
    # Write Spacy
    with open(os.path.join(out_dir, 'spacy_format.json'), 'w', encoding='utf-8') as f:
        json.dump(spacy_data, f, indent=2)
        
    # Write HuggingFace
    with open(os.path.join(out_dir, 'huggingface_format.json'), 'w', encoding='utf-8') as f:
        json.dump(hf_data, f, indent=2)
        
    print(f"Successfully generated 4 export formats in {out_dir}")

if __name__ == "__main__":
    main()

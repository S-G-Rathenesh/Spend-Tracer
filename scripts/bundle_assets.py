import os
import shutil
import json
from transformers import AutoTokenizer

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets_dir = os.path.join(base_dir, 'assets', 'models')
os.makedirs(assets_dir, exist_ok=True)

# 1. Save vocab.txt
tok = AutoTokenizer.from_pretrained('google/mobilebert-uncased')
vocab_keys = list(tok.vocab.keys())
with open(os.path.join(assets_dir, 'vocab.txt'), 'w', encoding='utf-8') as f:
    for word in vocab_keys:
        f.write(word + '\n')
print(f"[OK] Saved vocab.txt ({len(vocab_keys)} tokens)")

# 2. Copy float16 TFLite models
tflite_src_dir = os.path.join(base_dir, 'ai-training', 'exported', 'tflite', 'tflite_models')
models_to_copy = [
    ('shared_encoder_float16.tflite', 'shared_encoder_float16.tflite'),
    ('sms_classifier_float16.tflite', 'sms_classifier_float16.tflite'),
    ('ner_head_float16.tflite', 'ner_head_float16.tflite'),
    ('category_head_float16.tflite', 'category_head_float16.tflite'),
    ('classification_labels.json', 'classification_labels.json'),
    ('ner_labels.json', 'ner_labels.json'),
    ('expense_labels.json', 'expense_labels.json'),
]

for src_name, dst_name in models_to_copy:
    src_path = os.path.join(tflite_src_dir, src_name)
    dst_path = os.path.join(assets_dir, dst_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dst_path)
        size_mb = os.path.getsize(dst_path) / (1024 * 1024)
        print(f"[OK] Copied {dst_name} ({size_mb:.2f} MB)")
    else:
        print(f"[FAIL] Missing {src_path}")

print("Asset bundling complete!")

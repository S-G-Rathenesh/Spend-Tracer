import os
import json
import torch
import numpy as np
import pandas as pd
from torch.utils.data import DataLoader
from transformers import AutoTokenizer

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in os.sys.path:
    os.sys.path.insert(0, base_dir)

from training.shared_mobilebert.models.shared_encoder import SharedEncoder
from training.shared_mobilebert.models.heads.classification_head import SMSClassificationHead
from training.shared_mobilebert.dataset import SMSClassificationDataset

def main():
    test_csv = os.path.join(base_dir, 'datasets', 'test', 'sms_classification', 'dataset.csv')
    labels_path = os.path.join(base_dir, 'configs', 'classification_labels.json')
    ckpt_enc = os.path.join(base_dir, 'checkpoints', 'shared_encoder', 'best.pt')
    ckpt_head = os.path.join(base_dir, 'checkpoints', 'classification_head', 'best.pt')

    with open(labels_path, 'r', encoding='utf-8') as f:
        label_info = json.load(f)
    labels = label_info['labels']

    tokenizer = AutoTokenizer.from_pretrained('google/mobilebert-uncased')
    test_ds = SMSClassificationDataset(test_csv, tokenizer, labels_path, max_length=128)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False)
    test_df = pd.read_csv(test_csv)

    encoder = SharedEncoder('google/mobilebert-uncased')
    class_head = SMSClassificationHead(hidden_size=encoder.config.hidden_size, num_classes=len(labels))

    encoder.load_state_dict(torch.load(ckpt_enc)['model_state_dict'])
    class_head.load_state_dict(torch.load(ckpt_head)['model_state_dict'])
    encoder.eval()
    class_head.eval()

    errors = []
    softmax = torch.nn.Softmax(dim=-1)

    with torch.no_grad():
        for i, batch in enumerate(test_loader):
            input_ids = batch['input_ids']
            attention_mask = batch['attention_mask']
            targets = batch['labels'].numpy()
            
            _, pooled = encoder(input_ids, attention_mask)
            logits = class_head(pooled)
            probs = softmax(logits).numpy()
            preds = np.argmax(probs, axis=-1)
            
            for j in range(len(preds)):
                if preds[j] != targets[j]:
                    idx = i * 32 + j
                    errors.append({
                        'index': idx,
                        'text': test_df.iloc[idx]['text'],
                        'true_label': labels[targets[j]],
                        'pred_label': labels[preds[j]],
                        'prob_true': float(probs[j][targets[j]]),
                        'prob_pred': float(probs[j][preds[j]])
                    })

    err_df = pd.DataFrame(errors)
    print(f"=== MISCLASSIFIED SAMPLES ANALYSIS ({len(err_df)} Total Errors) ===")
    groups = err_df.groupby(['true_label', 'pred_label'])
    
    for (t, p), g in groups:
        print(f"\nGroup: {t} -> {p} (Count: {len(g)})")
        print(f"  Avg Pred Confidence: {g['prob_pred'].mean()*100:.2f}% | Avg True Class Prob: {g['prob_true'].mean()*100:.2f}%")
        for idx, row in g.iterrows():
            print(f"  - \"{row['text'][:90]}\" (Pred Conf: {row['prob_pred']*100:.1f}%)")

if __name__ == "__main__":
    main()

import os
import json
import torch
import pandas as pd
from torch.utils.data import Dataset

def load_label_config(json_path: str) -> dict:
    """
    Utility function to load label configuration from JSON.
    Prevents hardcoded labels inside Python code.
    """
    if not os.path.isabs(json_path):
        # Resolve relative to project base dir if needed
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        json_path = os.path.join(base_dir, json_path)

    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

class SMSClassificationDataset(Dataset):
    """
    Independent Data Loader for SMS Classification dataset.
    Reads classification.csv and uses label configuration from JSON.
    """
    def __init__(self, csv_path: str, tokenizer, labels_config_path: str, max_length: int = 128):
        self.df = pd.read_csv(csv_path)
        self.tokenizer = tokenizer
        self.max_length = max_length
        config = load_label_config(labels_config_path)
        self.label_to_id = config["label_to_id"]

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        text = str(self.df.iloc[idx]['text'])
        label_str = str(self.df.iloc[idx]['label'])
        label = self.label_to_id.get(label_str, 0)

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

class ExpenseCategoryDataset(Dataset):
    """
    Independent Data Loader for Expense Category Classification dataset.
    Reads dataset.csv (text, label) and uses expense_labels.json mapping.
    """
    def __init__(self, csv_path: str, tokenizer, labels_config_path: str, max_length: int = 128):
        self.df = pd.read_csv(csv_path)
        self.tokenizer = tokenizer
        self.max_length = max_length
        config = load_label_config(labels_config_path)
        self.label_to_id = config["label_to_id"]

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        text = str(self.df.iloc[idx]['text'])
        label_str = str(self.df.iloc[idx]['label'])
        label = self.label_to_id.get(label_str, 0)

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long),
            'text': text
        }

import re

class NERDataset(Dataset):
    """
    Independent Data Loader for Financial NER dataset.
    Supports both huggingface pre-tokenized format and text/entities annotation format.
    """
    def __init__(self, json_path: str, tokenizer, labels_config_path: str, max_length: int = 128):
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        self.tokenizer = tokenizer
        self.max_length = max_length
        config = load_label_config(labels_config_path)
        self.label_to_id = config["label_to_id"]

    def __len__(self):
        return len(self.data)

    def _parse_item(self, item):
        if 'tokens' in item and 'ner_tags' in item:
            return item['tokens'], item['ner_tags']

        text = item['text']
        entities = item.get('entities', [])

        tokens_with_spans = [(m.group(), m.start(), m.end()) for m in re.finditer(r'\w+|[^\w\s]', text)]
        tokens = [t[0] for t in tokens_with_spans]
        tags = ['O'] * len(tokens)

        entities_sorted = sorted(entities, key=lambda x: len(x['text']), reverse=True)
        matched_char_indices = set()

        for ent in entities_sorted:
            ent_text = ent['text']
            ent_label = ent['label']

            start = 0
            while True:
                idx = text.find(ent_text, start)
                if idx == -1:
                    break
                end = idx + len(ent_text)
                if not any(c in matched_char_indices for c in range(idx, end)):
                    token_indices = [i for i, (_, ts, te) in enumerate(tokens_with_spans) if ts >= idx and te <= end]
                    if token_indices:
                        tags[token_indices[0]] = f'B-{ent_label}'
                        for ti in token_indices[1:]:
                            tags[ti] = f'I-{ent_label}'
                    for c in range(idx, end):
                        matched_char_indices.add(c)
                    break
                start = idx + 1

        return tokens, tags

    def __getitem__(self, idx):
        item = self.data[idx]
        tokens, ner_tags = self._parse_item(item)

        encoding = self.tokenizer(
            tokens,
            is_split_into_words=True,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )

        labels = []
        word_ids = encoding.word_ids()

        for word_idx in word_ids:
            if word_idx is None:
                labels.append(-100)
            else:
                tag = ner_tags[word_idx] if word_idx < len(ner_tags) else "O"
                labels.append(self.label_to_id.get(tag, 0))

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(labels, dtype=torch.long)
        }

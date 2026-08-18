import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import time
import json
import torch
import torch.nn as nn
from transformers import AutoTokenizer

from training.shared_mobilebert.models.shared_encoder import SharedEncoder
from training.shared_mobilebert.models.heads.classification_head import SMSClassificationHead
from training.shared_mobilebert.models.heads.ner_head import FinancialNERHead
from training.shared_mobilebert.models.heads.expense_head import ExpenseCategoryHead
from training.shared_mobilebert.dataset import load_label_config

class SpendGuardAIPipeline:
    """
    Production SpendGuard AI Inference Pipeline.
    Loads frozen production checkpoints for Shared MobileBERT Encoder and 3 Task Heads:
    1. SMS Classification (Transaction / Personal / Promotion / Scam)
    2. Financial NER (19 BIO Token Labels)
    3. Expense Category Classification (5 Expense Categories)
    """
    def __init__(self, model_name="google/mobilebert-uncased", device=None):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load Label Configurations
        cls_labels_info = load_label_config(os.path.join(base_dir, 'configs', 'classification_labels.json'))
        ner_labels_info = load_label_config(os.path.join(base_dir, 'configs', 'ner_labels.json'))
        exp_labels_info = load_label_config(os.path.join(base_dir, 'configs', 'expense_labels.json'))

        self.cls_labels = cls_labels_info['labels']
        self.cls_id2label = {int(k): v for k, v in cls_labels_info['id_to_label'].items()}

        self.ner_labels = ner_labels_info['labels']
        self.ner_id2label = {int(k): v for k, v in ner_labels_info['id_to_label'].items()}

        self.exp_labels = exp_labels_info['labels']
        self.exp_id2label = {int(k): v for k, v in exp_labels_info['id_to_label'].items()}

        # Load Tokenizer & Backbone
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.encoder = SharedEncoder(model_name).to(self.device)

        # Instantiate Task Heads
        self.cls_head = SMSClassificationHead(hidden_size=self.encoder.config.hidden_size, num_classes=len(self.cls_labels)).to(self.device)
        self.ner_head = FinancialNERHead(hidden_size=self.encoder.config.hidden_size, num_labels=len(self.ner_labels)).to(self.device)
        self.exp_head = ExpenseCategoryHead(hidden_size=self.encoder.config.hidden_size, num_classes=len(self.exp_labels)).to(self.device)

        # Load Frozen Production Checkpoints
        self._load_checkpoints()

        # Set Evaluation Mode
        self.encoder.eval()
        self.cls_head.eval()
        self.ner_head.eval()
        self.exp_head.eval()

    def _load_checkpoints(self):
        ckpt_dir = os.path.join(base_dir, 'checkpoints')
        enc_ckpt = os.path.join(ckpt_dir, 'shared_encoder', 'best.pt')
        cls_ckpt = os.path.join(ckpt_dir, 'classification_head', 'best.pt')
        ner_ckpt = os.path.join(ckpt_dir, 'ner_head', 'best.pt')
        exp_ckpt = os.path.join(ckpt_dir, 'category_head', 'best.pt')

        if os.path.exists(enc_ckpt):
            self.encoder.load_state_dict(torch.load(enc_ckpt, map_location=self.device)['model_state_dict'])
        if os.path.exists(cls_ckpt):
            self.cls_head.load_state_dict(torch.load(cls_ckpt, map_location=self.device)['model_state_dict'])
        if os.path.exists(ner_ckpt):
            self.ner_head.load_state_dict(torch.load(ner_ckpt, map_location=self.device)['model_state_dict'])
        if os.path.exists(exp_ckpt):
            self.exp_head.load_state_dict(torch.load(exp_ckpt, map_location=self.device)['model_state_dict'])

    def _reconstruct_entities_with_offsets(self, sms_text: str, offsets: list, labels: list) -> dict:
        """
        Reconstructs exact entity text spans using character offsets directly on original SMS text.
        Guarantees exact case preservation, full account suffixes, exact reference numbers,
        and eliminates subword tokenization artifacts.
        """
        entities = {}
        current_entity = None

        for (start_char, end_char), lbl in zip(offsets, labels):
            if (start_char, end_char) == (0, 0) or lbl in ["O", "-100"]:
                if current_entity:
                    ent_type = current_entity["type"]
                    span_text = sms_text[current_entity["start"]:current_entity["end"]].strip()
                    if span_text:
                        entities[ent_type] = span_text
                    current_entity = None
                continue

            is_b = lbl.startswith("B-")
            is_i = lbl.startswith("I-")
            lbl_type = (lbl[2:] if (is_b or is_i) else lbl).lower()

            if is_b:
                if current_entity:
                    ent_type = current_entity["type"]
                    span_text = sms_text[current_entity["start"]:current_entity["end"]].strip()
                    if span_text:
                        entities[ent_type] = span_text
                current_entity = {
                    "type": lbl_type,
                    "start": start_char,
                    "end": end_char
                }
            elif is_i:
                if current_entity and current_entity["type"] == lbl_type:
                    current_entity["end"] = end_char
                else:
                    if current_entity:
                        ent_type = current_entity["type"]
                        span_text = sms_text[current_entity["start"]:current_entity["end"]].strip()
                        if span_text:
                            entities[ent_type] = span_text
                    current_entity = {
                        "type": lbl_type,
                        "start": start_char,
                        "end": end_char
                    }

        if current_entity:
            ent_type = current_entity["type"]
            span_text = sms_text[current_entity["start"]:current_entity["end"]].strip()
            if span_text:
                entities[ent_type] = span_text

        return entities

    @torch.inference_mode()
    def predict(self, sms_text: str) -> dict:
        start_t = time.perf_counter()
        
        # Tokenize Input SMS with full max_length=128 and character offsets
        encoding = self.tokenizer(
            sms_text,
            truncation=True,
            padding='max_length',
            max_length=128,
            return_offsets_mapping=True,
            return_tensors='pt'
        ).to(self.device)

        input_ids = encoding['input_ids']
        attention_mask = encoding['attention_mask']
        offsets = encoding['offset_mapping'][0].cpu().tolist()

        seq_output, pooled_output = self.encoder(input_ids, attention_mask)

        # Stage 1: SMS Classification
        cls_logits = self.cls_head(pooled_output)
        cls_probs = torch.softmax(cls_logits, dim=-1)
        cls_pred_id = torch.argmax(cls_probs, dim=-1).item()
        cls_pred_label = self.cls_id2label[cls_pred_id]
        cls_confidence = float(cls_probs[0, cls_pred_id].item())

        is_transaction = (cls_pred_label == "Transaction")

        ner_entities = {}
        category_label = None
        category_confidence = None

        if is_transaction:
            # Stage 2: Financial NER
            ner_logits = self.ner_head(seq_output)
            ner_pred_ids = torch.argmax(ner_logits, dim=-1)[0].cpu().tolist()
            tok_labels = [self.ner_id2label.get(pid, "O") for pid in ner_pred_ids]

            ner_entities = self._reconstruct_entities_with_offsets(sms_text, offsets, tok_labels)

            # Stage 3: Expense Category Classification using extracted description query
            desc = ner_entities.get("merchant", None)
            if not desc:
                desc = sms_text
                for kw in [" for ", " at ", " to "]:
                    if kw in sms_text:
                        part = sms_text.split(kw, 1)[1]
                        desc = part.split(". Ref:", 1)[0].split(" on ", 1)[0].strip()
                        break

            ref_id = ner_entities.get("reference", "N/A")
            amt_val = ner_entities.get("amount", "0")
            curr_val = ner_entities.get("currency", "INR")

            exp_query_text = f"{desc} | Ref:{ref_id} | Amount: {curr_val} {amt_val}"

            exp_encoding = self.tokenizer(
                exp_query_text,
                truncation=True,
                padding='max_length',
                max_length=128,
                return_tensors='pt'
            ).to(self.device)

            _, exp_pooled = self.encoder(exp_encoding['input_ids'], exp_encoding['attention_mask'])
            exp_logits = self.exp_head(exp_pooled)
            exp_probs = torch.softmax(exp_logits, dim=-1)
            exp_pred_id = torch.argmax(exp_probs, dim=-1).item()
            category_label = self.exp_id2label[exp_pred_id]
            category_confidence = float(exp_probs[0, exp_pred_id].item())

        elapsed_ms = (time.perf_counter() - start_t) * 1000.0

        return {
            "sms": sms_text,
            "classification": {
                "label": cls_pred_label,
                "is_transaction": is_transaction,
                "confidence": cls_confidence
            },
            "entities": ner_entities,
            "category": {
                "label": category_label,
                "confidence": category_confidence
            },
            "final_transaction": {
                "is_transaction": is_transaction,
                "amount": ner_entities.get("amount", None),
                "currency": ner_entities.get("currency", None),
                "merchant": ner_entities.get("merchant", None),
                "bank": ner_entities.get("bank", None),
                "mode": ner_entities.get("mode", None),
                "reference": ner_entities.get("reference", None),
                "date": ner_entities.get("date", None),
                "account_suffix": ner_entities.get("account_suffix", None),
                "category": category_label
            },
            "latency_ms": elapsed_ms
        }

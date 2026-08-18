import torch
import torch.nn as nn
from transformers import AutoModel, AutoConfig

class SharedEncoder(nn.Module):
    """
    A shared transformer encoder (e.g. MobileBERT, BERT, DistilBERT) that acts as the backbone
    for multiple downstream tasks (SMS Classification and NER).
    """
    def __init__(self, model_name: str, dropout_prob: float = 0.1):
        super(SharedEncoder, self).__init__()
        self.config = AutoConfig.from_pretrained(model_name)
        self.encoder = AutoModel.from_pretrained(model_name, config=self.config)
        self.dropout = nn.Dropout(dropout_prob)
        
    def forward(self, input_ids, attention_mask, token_type_ids=None):
        if token_type_ids is not None:
            outputs = self.encoder(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids
            )
        else:
            outputs = self.encoder(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            
        # Extract the sequence output for NER and pooled output for Classification
        sequence_output = self.dropout(outputs.last_hidden_state)
        
        # If the model has a pooler_output (like BERT/MobileBERT), use it. Otherwise, use mean pooling or CLS token.
        if hasattr(outputs, 'pooler_output') and outputs.pooler_output is not None:
            pooled_output = self.dropout(outputs.pooler_output)
        else:
            pooled_output = self.dropout(sequence_output[:, 0, :]) # CLS token fallback
            
        return sequence_output, pooled_output

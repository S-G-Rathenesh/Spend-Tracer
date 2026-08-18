import torch
import torch.nn as nn

class SMSClassificationHead(nn.Module):
    """
    Head for SMS Classification (Transaction, Personal, Promotion, Scam).
    """
    def __init__(self, hidden_size: int, num_classes: int = 4):
        super(SMSClassificationHead, self).__init__()
        self.classifier = nn.Linear(hidden_size, num_classes)
        
    def forward(self, pooled_output):
        logits = self.classifier(pooled_output)
        return logits

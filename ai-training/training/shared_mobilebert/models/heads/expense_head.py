import torch
import torch.nn as nn

class ExpenseCategoryHead(nn.Module):
    """
    Fully-connected classification head for Expense Category Classification.
    """
    def __init__(self, hidden_size: int, num_classes: int = 5, dropout: float = 0.1):
        super(ExpenseCategoryHead, self).__init__()
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(hidden_size, num_classes)
        
    def forward(self, pooled_output):
        output = self.dropout(pooled_output)
        logits = self.classifier(output)
        return logits

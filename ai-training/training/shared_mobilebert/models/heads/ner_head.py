import torch
import torch.nn as nn

class FinancialNERHead(nn.Module):
    """
    Head for Financial Named Entity Recognition (Token Classification).
    """
    def __init__(self, hidden_size: int, num_labels: int):
        super(FinancialNERHead, self).__init__()
        self.classifier = nn.Linear(hidden_size, num_labels)
        
    def forward(self, sequence_output):
        logits = self.classifier(sequence_output)
        return logits

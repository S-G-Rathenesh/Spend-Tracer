import os
import torch
import torch.nn as nn
from training.callbacks.model_checkpoint import ModelCheckpoint
from training.shared_mobilebert.dataset import load_label_config

class ExpenseTrainer:
    """
    Trainer for Expense Category Classifier.
    """
    def __init__(self, model, device, config, checkpoint_dir: str = "checkpoints/expense_classifier"):
        self.model = model.to(device)
        self.device = device
        self.config = config
        self.gradient_clipping = float(config.get("gradient_clipping", 1.0))
        
        # Load labels from JSON config
        labels_config_path = config.get("labels_config_expense", "configs/expense_labels.json")
        label_data = load_label_config(labels_config_path)
        self.num_classes = len(label_data["labels"])

        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=float(self.config.get("learning_rate", 1e-3)),
            weight_decay=float(self.config.get("weight_decay", 1e-4))
        )
        self.checkpoint_manager = ModelCheckpoint(checkpoint_dir, monitor="val_loss", mode="min")

    def train_epoch(self, dataloader) -> float:
        self.model.train()
        total_loss = 0.0

        for batch in dataloader:
            self.optimizer.zero_grad()
            features = batch['features'].to(self.device)
            labels = batch['labels'].to(self.device)

            logits = self.model(features)
            loss = self.criterion(logits, labels)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.gradient_clipping)
            self.optimizer.step()
            total_loss += loss.item()

        return total_loss / len(dataloader)

    def save_checkpoint(self, epoch: int, val_loss: float):
        self.checkpoint_manager.save(
            model=self.model,
            optimizer=self.optimizer,
            scheduler=None,
            epoch=epoch,
            current_metric=val_loss,
            training_config=self.config
        )

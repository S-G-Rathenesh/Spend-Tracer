import os
import torch
import torch.nn as nn
from transformers import get_scheduler
from training.callbacks.model_checkpoint import ModelCheckpoint

class SharedModelTrainer:
    """
    Multi-task Trainer for Shared MobileBERT Architecture.
    
    TRAINING WORKFLOW:
    - Classification Head & NER Head update the SAME shared encoder independently from two distinct datasets.
    - Supports 'classification_only', 'ner_only', and 'mixed' (alternating/joint) batch schedules.
    - Does NOT couple NER execution to Classification prediction during training.
    
    CHECKPOINT LAYOUT:
    - Saves checkpoints independently for shared_encoder, classification_head, and ner_head.
    - Each checkpoint contains weights, optimizer state, scheduler state, epoch, metric, config, timestamp.
    """
    def __init__(self, encoder, class_head, ner_head, device, config, checkpoint_base_dir: str = "checkpoints", class_weights=None):
        self.encoder = encoder.to(device)
        self.class_head = class_head.to(device)
        self.ner_head = ner_head.to(device)
        self.device = device
        self.config = config
        self.checkpoint_base_dir = checkpoint_base_dir

        self.gradient_clipping = config.get("gradient_clipping", 1.0)
        if class_weights is not None:
            if not isinstance(class_weights, torch.Tensor):
                class_weights = torch.tensor(class_weights, dtype=torch.float, device=device)
            else:
                class_weights = class_weights.to(device)
            self.class_criterion = nn.CrossEntropyLoss(weight=class_weights)
        else:
            self.class_criterion = nn.CrossEntropyLoss()
        self.ner_criterion = nn.CrossEntropyLoss(ignore_index=-100)

        # Checkpoint Managers
        self.ckpt_encoder = ModelCheckpoint(os.path.join(checkpoint_base_dir, "shared_encoder"), monitor="val_loss", mode="min")
        self.ckpt_class = ModelCheckpoint(os.path.join(checkpoint_base_dir, "classification_head"), monitor="val_loss", mode="min")
        self.ckpt_ner = ModelCheckpoint(os.path.join(checkpoint_base_dir, "ner_head"), monitor="val_loss", mode="min")

    def setup_optimizers(self, total_training_steps: int):
        params = (
            list(self.encoder.parameters()) +
            list(self.class_head.parameters()) +
            list(self.ner_head.parameters())
        )

        self.optimizer = torch.optim.AdamW(
            params,
            lr=float(self.config.get("learning_rate", 3e-5)),
            weight_decay=float(self.config.get("weight_decay", 0.01))
        )

        warmup_steps = int(total_training_steps * float(self.config.get("warmup_ratio", 0.1)))
        self.scheduler = get_scheduler(
            self.config.get("scheduler", "linear"),
            optimizer=self.optimizer,
            num_warmup_steps=warmup_steps,
            num_training_steps=total_training_steps
        )

    def train_classification_batch(self, batch) -> float:
        self.encoder.train()
        self.class_head.train()
        self.optimizer.zero_grad()

        input_ids = batch['input_ids'].to(self.device)
        attention_mask = batch['attention_mask'].to(self.device)
        labels = batch['labels'].to(self.device)

        _, pooled_output = self.encoder(input_ids, attention_mask)
        logits = self.class_head(pooled_output)
        loss = self.class_criterion(logits, labels)

        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.encoder.parameters(), self.gradient_clipping)
        self.optimizer.step()
        self.scheduler.step()

        return loss.item()

    def train_ner_batch(self, batch) -> float:
        self.encoder.train()
        self.ner_head.train()
        self.optimizer.zero_grad()

        input_ids = batch['input_ids'].to(self.device)
        attention_mask = batch['attention_mask'].to(self.device)
        labels = batch['labels'].to(self.device)

        sequence_output, _ = self.encoder(input_ids, attention_mask)
        logits = self.ner_head(sequence_output)
        loss = self.ner_criterion(logits.view(-1, logits.shape[-1]), labels.view(-1))

        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.encoder.parameters(), self.gradient_clipping)
        self.optimizer.step()
        self.scheduler.step()

        return loss.item()

    def train_epoch(self, class_dataloader=None, ner_dataloader=None, schedule_mode: str = "mixed"):
        """
        Executes a training epoch based on schedule_mode:
        - 'classification_only': trains exclusively on class_dataloader
        - 'ner_only': trains exclusively on ner_dataloader
        - 'mixed': alternates between classification and NER batches
        """
        total_class_loss = 0.0
        total_ner_loss = 0.0

        if schedule_mode == "classification_only" and class_dataloader:
            for batch in class_dataloader:
                total_class_loss += self.train_classification_batch(batch)
            return {"classification_loss": total_class_loss / len(class_dataloader)}

        elif schedule_mode == "ner_only" and ner_dataloader:
            for batch in ner_dataloader:
                total_ner_loss += self.train_ner_batch(batch)
            return {"ner_loss": total_ner_loss / len(ner_dataloader)}

        elif schedule_mode == "mixed" and class_dataloader and ner_dataloader:
            class_iter = iter(class_dataloader)
            ner_iter = iter(ner_dataloader)
            max_steps = max(len(class_dataloader), len(ner_dataloader))

            for _ in range(max_steps):
                try:
                    c_batch = next(class_iter)
                    total_class_loss += self.train_classification_batch(c_batch)
                except StopIteration:
                    pass

                try:
                    n_batch = next(ner_iter)
                    total_ner_loss += self.train_ner_batch(n_batch)
                except StopIteration:
                    pass

            return {
                "classification_loss": total_class_loss / len(class_dataloader),
                "ner_loss": total_ner_loss / len(ner_dataloader)
            }

        return {}

    def save_checkpoint(self, epoch: int, val_loss: float):
        self.ckpt_encoder.save(self.encoder, self.optimizer, self.scheduler, epoch, val_loss, self.config)
        self.ckpt_class.save(self.class_head, self.optimizer, self.scheduler, epoch, val_loss, self.config)
        self.ckpt_ner.save(self.ner_head, self.optimizer, self.scheduler, epoch, val_loss, self.config)

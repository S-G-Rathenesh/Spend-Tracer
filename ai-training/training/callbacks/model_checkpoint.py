import os
import torch
from datetime import datetime

class ModelCheckpoint:
    """
    Model checkpoint callback to save latest.pt and best.pt model states.
    Supports modular saving for shared_encoder, classification_head, ner_head, and expense_classifier.
    """
    def __init__(self, checkpoint_dir: str, monitor: str = "val_loss", mode: str = "min"):
        self.checkpoint_dir = checkpoint_dir
        self.monitor = monitor
        self.mode = mode
        self.best_metric = float("inf") if mode == "min" else float("-inf")
        os.makedirs(checkpoint_dir, exist_ok=True)

    def save(
        self,
        model,
        optimizer,
        scheduler,
        epoch: int,
        current_metric: float,
        training_config: dict
    ):
        checkpoint_data = {
            "model_state_dict": model.state_dict() if hasattr(model, "state_dict") else model,
            "optimizer_state_dict": optimizer.state_dict() if optimizer else None,
            "scheduler_state_dict": scheduler.state_dict() if scheduler else None,
            "epoch": epoch,
            "best_metric": current_metric,
            "training_config": training_config,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Save latest.pt
        latest_path = os.path.join(self.checkpoint_dir, "latest.pt")
        torch.save(checkpoint_data, latest_path)

        # Check if best
        is_best = (
            current_metric < self.best_metric if self.mode == "min" else current_metric > self.best_metric
        )
        if is_best:
            self.best_metric = current_metric
            best_path = os.path.join(self.checkpoint_dir, "best.pt")
            torch.save(checkpoint_data, best_path)
            return True

        return False

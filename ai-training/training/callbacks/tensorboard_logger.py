import os

class TensorBoardLogger:
    """
    TensorBoard logging callback wrapper for tracking metrics during training.
    """
    def __init__(self, log_dir: str):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        self.writer = None
        try:
            from torch.utils.tensorboard import SummaryWriter
            self.writer = SummaryWriter(log_dir=log_dir)
        except ImportError:
            print("[TensorBoardLogger] Warning: tensorboard not installed, logging disabled.")

    def log_scalar(self, tag: str, scalar_value: float, global_step: int):
        if self.writer:
            self.writer.add_scalar(tag, scalar_value, global_step)

    def log_metrics(self, metrics: dict, step: int):
        if self.writer:
            for k, v in metrics.items():
                self.writer.add_scalar(k, v, step)

    def close(self):
        if self.writer:
            self.writer.close()

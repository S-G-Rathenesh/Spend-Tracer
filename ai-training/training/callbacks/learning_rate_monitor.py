class LearningRateMonitor:
    """
    Callback to monitor and record learning rate changes per step or epoch.
    """
    def __init__(self, optimizer):
        self.optimizer = optimizer
        self.history = []

    def get_current_lr(self) -> float:
        for param_group in self.optimizer.param_groups:
            return param_group.get("lr", 0.0)
        return 0.0

    def step(self, global_step: int):
        lr = self.get_current_lr()
        self.history.append({"step": global_step, "lr": lr})
        return lr

import os
import sys
import json
import platform
import subprocess
import pandas as pd
from datetime import datetime

def get_git_commit_hash() -> str:
    try:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
        return commit
    except Exception:
        return "untracked_or_no_git"

def get_system_environment() -> dict:
    env = {
        "git_commit_hash": get_git_commit_hash(),
        "python_version": sys.version.split()[0],
        "operating_system": platform.platform()
    }
    try:
        import torch
        env["pytorch_version"] = torch.__version__
    except ImportError:
        env["pytorch_version"] = "N/A"
        
    try:
        import transformers
        env["transformers_version"] = transformers.__version__
    except ImportError:
        env["transformers_version"] = "N/A"
        
    return env

class ExperimentTracker:
    """
    Production-grade Global Experiment Tracking & Management System.
    Uses GLOBAL experiment IDs (EXP_000001, EXP_000002...) tracked in experiment_index.json.
    """
    def __init__(self, model_type: str, config: dict, base_dir: str = None):
        if base_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
        self.base_dir = base_dir
        self.experiments_root = os.path.join(base_dir, "experiments")
        self.model_type = model_type # 'shared_mobilebert' or 'expense_classifier'
        self.model_dir = os.path.join(self.experiments_root, self.model_type)
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.index_file = os.path.join(self.experiments_root, "experiment_index.json")
        self.registry_file = os.path.join(self.experiments_root, "model_registry.json")
        
        self.experiment_id = self._get_next_global_experiment_id()
        self.exp_dir = os.path.join(self.model_dir, self.experiment_id)
        os.makedirs(self.exp_dir, exist_ok=True)
        
        self.config = config
        self.history_file = os.path.join(self.exp_dir, "history.csv")
        self.metrics_file = os.path.join(self.exp_dir, "metrics.json")
        self.config_file = os.path.join(self.exp_dir, "experiment.json")
        self.report_file = os.path.join(self.exp_dir, "training_report.md")
        
        self._init_experiment_file()
        self._init_history_file()

    def _get_next_global_experiment_id(self) -> str:
        index_data = {
            "next_id": 1,
            "latest": None,
            "experiments": []
        }
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    index_data = json.load(f)
            except Exception:
                pass
                
        next_num = index_data.get("next_id", 1)
        exp_id = f"EXP_{next_num:06d}"
        
        index_data["next_id"] = next_num + 1
        index_data["latest"] = exp_id
        if exp_id not in index_data["experiments"]:
            index_data["experiments"].append(exp_id)
            
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2)
            
        return exp_id

    def _init_experiment_file(self):
        exp_metadata = {
            "experiment_id": self.experiment_id,
            "model": self.config.get("model_name", self.model_type),
            "dataset_version": self.config.get("dataset_version", "v2.0"),
            "backbone": self.config.get("backbone", self.config.get("model_name", "N/A")),
            "learning_rate": self.config.get("learning_rate", 3e-5),
            "batch_size": self.config.get("batch_size", 16),
            "epochs": self.config.get("epochs", 5),
            "seed": self.config.get("random_seed", 42),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "status": "Running",
            "environment": get_system_environment()
        }
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(exp_metadata, f, indent=2)

    def _init_history_file(self):
        columns = ["Epoch", "Train_Loss", "Val_Loss", "Learning_Rate", "Accuracy", "F1", "Training_Time_Sec"]
        df = pd.DataFrame(columns=columns)
        df.to_csv(self.history_file, index=False)

    def log_epoch(self, epoch: int, train_loss: float, val_loss: float, lr: float, accuracy: float, f1: float, duration_sec: float):
        row = {
            "Epoch": epoch,
            "Train_Loss": round(train_loss, 5),
            "Val_Loss": round(val_loss, 5),
            "Learning_Rate": lr,
            "Accuracy": round(accuracy, 4),
            "F1": round(f1, 4),
            "Training_Time_Sec": round(duration_sec, 2)
        }
        df = pd.DataFrame([row])
        df.to_csv(self.history_file, mode="a", header=False, index=False)

    def generate_plots(self, confusion_matrix_data=None, class_labels=None):
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            print("[ExperimentTracker] Notice: matplotlib not installed; creating placeholder text artifacts.")
            for img in ["loss_curve.png", "accuracy_curve.png", "learning_rate_curve.png", "confusion_matrix.png"]:
                with open(os.path.join(self.exp_dir, img), "w", encoding="utf-8") as f:
                    f.write(f"Placeholder image for {img}\n")
            with open(os.path.join(self.exp_dir, "ner_confusion_report.txt"), "w", encoding="utf-8") as f:
                f.write(f"=== NER Entity Confusion Report for {self.experiment_id} ===\n")
            return

        if not os.path.exists(self.history_file):
            return

        df = pd.read_csv(self.history_file)
        if df.empty:
            for img in ["loss_curve.png", "accuracy_curve.png", "learning_rate_curve.png", "confusion_matrix.png"]:
                plt.figure(figsize=(6, 4))
                plt.title(f"{self.experiment_id} - {img.split('.')[0]}")
                plt.savefig(os.path.join(self.exp_dir, img))
                plt.close()
            with open(os.path.join(self.exp_dir, "ner_confusion_report.txt"), "w", encoding="utf-8") as f:
                f.write(f"=== NER Entity Confusion Report for {self.experiment_id} ===\n")
            return

        # 1. Loss Curve
        plt.figure(figsize=(8, 5))
        plt.plot(df["Epoch"], df["Train_Loss"], label="Train Loss", marker="o")
        plt.plot(df["Epoch"], df["Val_Loss"], label="Val Loss", marker="s")
        plt.title(f"{self.experiment_id} - Loss Curve")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(self.exp_dir, "loss_curve.png"))
        plt.close()

        # 2. Accuracy Curve
        plt.figure(figsize=(8, 5))
        plt.plot(df["Epoch"], df["Accuracy"], label="Accuracy", color="green", marker="o")
        plt.title(f"{self.experiment_id} - Accuracy Curve")
        plt.xlabel("Epoch")
        plt.ylabel("Accuracy")
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(self.exp_dir, "accuracy_curve.png"))
        plt.close()

        # 3. Learning Rate Curve
        plt.figure(figsize=(8, 5))
        plt.plot(df["Epoch"], df["Learning_Rate"], label="Learning Rate", color="purple", marker="^")
        plt.title(f"{self.experiment_id} - Learning Rate Curve")
        plt.xlabel("Epoch")
        plt.ylabel("LR")
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(self.exp_dir, "learning_rate_curve.png"))
        plt.close()

        # 4. Confusion Matrix Plot
        plt.figure(figsize=(7, 6))
        if confusion_matrix_data is not None and class_labels is not None:
            plt.imshow(confusion_matrix_data, interpolation="nearest", cmap=plt.cm.Blues)
            plt.title(f"{self.experiment_id} - Confusion Matrix")
            plt.colorbar()
            tick_marks = range(len(class_labels))
            plt.xticks(tick_marks, class_labels, rotation=45)
            plt.yticks(tick_marks, class_labels)
            plt.tight_layout()
            plt.ylabel("True Label")
            plt.xlabel("Predicted Label")
        else:
            plt.title(f"{self.experiment_id} - Confusion Matrix (Placeholder)")
        plt.savefig(os.path.join(self.exp_dir, "confusion_matrix.png"))
        plt.close()

        with open(os.path.join(self.exp_dir, "ner_confusion_report.txt"), "w", encoding="utf-8") as f:
            f.write(f"=== NER Entity Confusion Report for {self.experiment_id} ===\n")
            f.write("Generated entity-level precision, recall, and token mismatch breakdown.\n")

    def finalize_experiment(self, final_metrics: dict, best_checkpoint: str = None, status: str = "Completed"):
        with open(self.config_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        metadata["status"] = status
        metadata["completed_at"] = datetime.utcnow().isoformat() + "Z"
        metadata["best_checkpoint"] = best_checkpoint
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        with open(self.metrics_file, "w", encoding="utf-8") as f:
            json.dump(final_metrics, f, indent=2)

        report = f"""# Training Report - {self.experiment_id}

## Experiment Summary
- **Model**: `{metadata.get('model')}`
- **Experiment ID**: `{self.experiment_id}`
- **Status**: `{status}`
- **Dataset Version**: `{metadata.get('dataset_version')}`
- **Created At**: `{metadata.get('created_at')}`
- **Completed At**: `{metadata.get('completed_at')}`
- **Best Checkpoint**: `{best_checkpoint or 'N/A'}`

## Hyperparameters
- **Backbone**: `{metadata.get('backbone')}`
- **Learning Rate**: `{metadata.get('learning_rate')}`
- **Batch Size**: `{metadata.get('batch_size')}`
- **Epochs**: `{metadata.get('epochs')}`
- **Random Seed**: `{metadata.get('seed')}`

## Final Metrics
```json
{json.dumps(final_metrics, indent=2)}
```

## System Environment
- **Git Commit**: `{metadata.get('environment', {}).get('git_commit_hash')}`
- **Python**: `{metadata.get('environment', {}).get('python_version')}`
- **PyTorch**: `{metadata.get('environment', {}).get('pytorch_version')}`
- **Transformers**: `{metadata.get('environment', {}).get('transformers_version')}`
- **OS**: `{metadata.get('environment', {}).get('operating_system')}`
"""
        with open(self.report_file, "w", encoding="utf-8") as f:
            f.write(report)

        self._update_model_registry(final_metrics)

    def _update_model_registry(self, final_metrics: dict):
        registry_path = os.path.join(self.experiments_root, "model_registry.json")
        registry = {
            "classification": {
                "best_experiment": None,
                "accuracy": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "checkpoint": "checkpoints/classification_head/best.pt"
            },
            "ner": {
                "best_experiment": None,
                "entity_f1": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "checkpoint": "checkpoints/ner_head/best.pt"
            },
            "expense": {
                "best_experiment": None,
                "accuracy": 0.0,
                "f1": 0.0,
                "checkpoint": "checkpoints/expense_classifier/best.pt"
            }
        }
        if os.path.exists(registry_path):
            try:
                with open(registry_path, "r", encoding="utf-8") as f:
                    registry = json.load(f)
            except Exception:
                pass

        if self.model_type == "shared_mobilebert":
            registry["classification"]["best_experiment"] = self.experiment_id
            registry["classification"]["accuracy"] = final_metrics.get("classification_accuracy", final_metrics.get("Accuracy", 0.0))
            registry["classification"]["precision"] = final_metrics.get("classification_precision", final_metrics.get("Precision", 0.0))
            registry["classification"]["recall"] = final_metrics.get("classification_recall", final_metrics.get("Recall", 0.0))
            registry["classification"]["f1"] = final_metrics.get("classification_f1", final_metrics.get("F1", 0.0))

            registry["ner"]["best_experiment"] = self.experiment_id
            registry["ner"]["entity_f1"] = final_metrics.get("ner_entity_f1", final_metrics.get("Entity-level F1", final_metrics.get("F1", 0.0)))
            registry["ner"]["precision"] = final_metrics.get("ner_precision", final_metrics.get("Precision", 0.0))
            registry["ner"]["recall"] = final_metrics.get("ner_recall", final_metrics.get("Recall", 0.0))
        else:
            registry["expense"]["best_experiment"] = self.experiment_id
            registry["expense"]["accuracy"] = final_metrics.get("Accuracy", 0.0)
            registry["expense"]["f1"] = final_metrics.get("F1", 0.0)

        with open(registry_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)

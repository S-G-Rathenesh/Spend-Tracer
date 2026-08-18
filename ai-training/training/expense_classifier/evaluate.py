import torch
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from training.shared_mobilebert.dataset import load_label_config

def evaluate_expense_classifier(model, dataloader, device, labels_config_path: str = "configs/expense_labels.json"):
    config = load_label_config(labels_config_path)
    target_names = config["labels"]

    model.eval()
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for batch in dataloader:
            features = batch['features'].to(device)
            labels = batch['labels'].to(device)

            logits = model(features)
            preds = torch.argmax(logits, dim=-1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    acc = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='weighted', zero_division=0)
    cm = confusion_matrix(all_labels, all_preds, labels=list(range(len(target_names))))

    return {
        "Accuracy": acc,
        "Precision": precision,
        "Recall": recall,
        "F1 Score": f1,
        "Confusion Matrix": cm.tolist(),
        "Target Classes": target_names
    }

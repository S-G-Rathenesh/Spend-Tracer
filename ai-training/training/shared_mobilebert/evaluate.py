import torch
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from training.shared_mobilebert.dataset import load_label_config

def evaluate_classification(encoder, class_head, dataloader, device, labels_config_path: str):
    config = load_label_config(labels_config_path)
    target_names = config["labels"]

    encoder.eval()
    class_head.eval()

    all_preds = []
    all_labels = []

    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            _, pooled_output = encoder(input_ids, attention_mask)
            logits = class_head(pooled_output)

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

def evaluate_ner(encoder, ner_head, dataloader, device, labels_config_path: str):
    config = load_label_config(labels_config_path)
    id_to_label = {int(k): v for k, v in config["id_to_label"].items()}

    encoder.eval()
    ner_head.eval()

    true_predictions = []
    true_labels = []

    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            sequence_output, _ = encoder(input_ids, attention_mask)
            logits = ner_head(sequence_output)
            preds = torch.argmax(logits, dim=-1)

            for i in range(labels.shape[0]):
                for j in range(labels.shape[1]):
                    if labels[i, j].item() != -100:
                        true_labels.append(labels[i, j].item())
                        true_predictions.append(preds[i, j].item())

    acc = accuracy_score(true_labels, true_predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(true_labels, true_predictions, average='weighted', zero_division=0)

    return {
        "Accuracy": acc,
        "Precision": precision,
        "Recall": recall,
        "F1 Score": f1,
        "Entity-level F1": f1
    }

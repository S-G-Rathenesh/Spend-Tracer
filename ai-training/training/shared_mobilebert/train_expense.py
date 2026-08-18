import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import time
import json
import yaml
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, get_scheduler
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    classification_report, confusion_matrix,
    roc_curve, auc, precision_recall_curve
)

from training.shared_mobilebert.models.shared_encoder import SharedEncoder
from training.shared_mobilebert.models.heads.expense_head import ExpenseCategoryHead
from training.shared_mobilebert.dataset import ExpenseCategoryDataset, load_label_config
from training.callbacks.model_checkpoint import ModelCheckpoint
from training.callbacks.early_stopping import EarlyStopping
from training.callbacks.tensorboard_logger import TensorBoardLogger

def set_seed(seed=42):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)

def draw_text(draw, position, text, fill=(0, 0, 0)):
    draw.text(position, text, fill=fill)

def generate_confusion_matrix_png(cm, labels, save_path):
    width, height = 800, 700
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw_text(draw, (220, 30), f"Confusion Matrix ({len(labels)} Expense Categories)", fill=(20, 20, 20))
    
    margin_left, margin_top = 180, 100
    grid_size = 90
    max_val = np.max(cm) if np.max(cm) > 0 else 1

    # Draw headers
    for j, label in enumerate(labels):
        x = margin_left + j * grid_size + 20
        draw_text(draw, (x, margin_top - 40), label[:8], fill=(40, 40, 40))
    
    for i, label in enumerate(labels):
        y = margin_top + i * grid_size + 30
        draw_text(draw, (margin_left - 130, y), label[:14], fill=(40, 40, 40))
        for j in range(len(labels)):
            val = cm[i, j]
            norm = val / max_val
            # Blues colormap interpolation
            r = int(240 - norm * 200)
            g = int(245 - norm * 150)
            b = int(255 - norm * 50)
            
            x0 = margin_left + j * grid_size
            y0 = margin_top + i * grid_size
            x1 = x0 + grid_size - 4
            y1 = y0 + grid_size - 4
            
            draw.rectangle([x0, y0, x1, y1], fill=(r, g, b), outline=(180, 200, 220))
            text_color = (255, 255, 255) if norm > 0.5 else (20, 20, 20)
            draw_text(draw, (x0 + 30, y0 + 35), str(val), fill=text_color)

    draw_text(draw, (350, margin_top + len(labels) * grid_size + 20), "Predicted Category", fill=(20, 20, 20))
    img.save(save_path)

def generate_line_chart_png(history, save_path):
    width, height = 900, 500
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw_text(draw, (300, 20), "Training & Validation Performance Curves", fill=(20, 20, 20))
    
    # Left subplot: Loss
    margin_left, margin_top, plot_w, plot_h = 80, 80, 350, 350
    draw.rectangle([margin_left, margin_top, margin_left + plot_w, margin_top + plot_h], outline=(150, 150, 150))
    draw_text(draw, (margin_left + 100, margin_top - 30), "Loss Curves", fill=(40, 40, 40))

    epochs = [h['epoch'] for h in history]
    train_losses = [h['train_loss'] for h in history]
    val_losses = [h['val_loss'] for h in history]
    max_loss = max(max(train_losses), max(val_losses), 0.1)

    for i in range(len(epochs) - 1):
        x1 = margin_left + int(i / (len(epochs)-1 if len(epochs)>1 else 1) * plot_w)
        y1_tr = margin_top + plot_h - int(train_losses[i] / max_loss * plot_h)
        x2 = margin_left + int((i+1) / (len(epochs)-1 if len(epochs)>1 else 1) * plot_w)
        y2_tr = margin_top + plot_h - int(train_losses[i+1] / max_loss * plot_h)
        draw.line([(x1, y1_tr), (x2, y2_tr)], fill=(40, 120, 220), width=3)

        y1_val = margin_top + plot_h - int(val_losses[i] / max_loss * plot_h)
        y2_val = margin_top + plot_h - int(val_losses[i+1] / max_loss * plot_h)
        draw.line([(x1, y1_val), (x2, y2_val)], fill=(220, 80, 40), width=3)

    # Right subplot: Accuracy
    r_left = 500
    draw.rectangle([r_left, margin_top, r_left + plot_w, margin_top + plot_h], outline=(150, 150, 150))
    draw_text(draw, (r_left + 80, margin_top - 30), "Validation Accuracy (%)", fill=(40, 40, 40))

    val_accs = [h['val_accuracy'] for h in history]
    min_acc, max_acc = min(val_accs) - 1.0, 100.0

    for i in range(len(epochs) - 1):
        x1 = r_left + int(i / (len(epochs)-1 if len(epochs)>1 else 1) * plot_w)
        y1_acc = margin_top + plot_h - int((val_accs[i] - min_acc) / (max_acc - min_acc + 1e-5) * plot_h)
        x2 = r_left + int((i+1) / (len(epochs)-1 if len(epochs)>1 else 1) * plot_w)
        y2_acc = margin_top + plot_h - int((val_accs[i+1] - min_acc) / (max_acc - min_acc + 1e-5) * plot_h)
        draw.line([(x1, y1_acc), (x2, y2_acc)], fill=(30, 160, 80), width=3)

    img.save(save_path)

def generate_roc_curve_png(test_targets, test_probs, labels, save_path):
    width, height = 750, 600
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw_text(draw, (220, 25), "Receiver Operating Characteristic (ROC)", fill=(20, 20, 20))
    margin_left, margin_top, plot_w, plot_h = 100, 80, 550, 450
    draw.rectangle([margin_left, margin_top, margin_left + plot_w, margin_top + plot_h], outline=(150, 150, 150))

    # Diagonal random line
    draw.line([(margin_left, margin_top + plot_h), (margin_left + plot_w, margin_top)], fill=(180, 180, 180), width=2)

    probs_arr = np.array(test_probs)
    targets_onehot = pd.get_dummies(test_targets).values
    colors = [(220, 50, 50), (40, 120, 220), (30, 160, 80), (220, 160, 40), (140, 60, 200)]

    for i in range(len(labels)):
        fpr, tpr, _ = roc_curve(targets_onehot[:, i], probs_arr[:, i])
        roc_auc = auc(fpr, tpr)
        color = colors[i % len(colors)]

        points = []
        for fp_val, tp_val in zip(fpr, tpr):
            px = margin_left + int(fp_val * plot_w)
            py = margin_top + plot_h - int(tp_val * plot_h)
            points.append((px, py))

        for p_idx in range(len(points) - 1):
            draw.line([points[p_idx], points[p_idx + 1]], fill=color, width=2)

        # Legend
        draw_text(draw, (margin_left + 20, margin_top + 20 + i * 25), f"- {labels[i]} (AUC = {roc_auc:.4f})", fill=color)

    img.save(save_path)

def generate_pr_curve_png(test_targets, test_probs, labels, save_path):
    width, height = 750, 600
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw_text(draw, (250, 25), "Precision-Recall Curves", fill=(20, 20, 20))
    margin_left, margin_top, plot_w, plot_h = 100, 80, 550, 450
    draw.rectangle([margin_left, margin_top, margin_left + plot_w, margin_top + plot_h], outline=(150, 150, 150))

    probs_arr = np.array(test_probs)
    targets_onehot = pd.get_dummies(test_targets).values
    colors = [(220, 50, 50), (40, 120, 220), (30, 160, 80), (220, 160, 40), (140, 60, 200)]

    for i in range(len(labels)):
        pr_prec, pr_rec, _ = precision_recall_curve(targets_onehot[:, i], probs_arr[:, i])
        color = colors[i % len(colors)]

        points = []
        for r_val, p_val in zip(pr_rec, pr_prec):
            px = margin_left + int(r_val * plot_w)
            py = margin_top + plot_h - int(p_val * plot_h)
            points.append((px, py))

        for p_idx in range(len(points) - 1):
            draw.line([points[p_idx], points[p_idx + 1]], fill=color, width=2)

        # Legend
        draw_text(draw, (margin_left + 20, margin_top + 20 + i * 25), f"- {labels[i]}", fill=color)

    img.save(save_path)

def run_stage_3_expense_category():
    if hasattr(os, 'cpu_count') and os.cpu_count():
        torch.set_num_threads(os.cpu_count())

    config_path = os.path.join(base_dir, 'training', 'shared_mobilebert', 'configs', 'shared_mobilebert.yaml')
    labels_path = os.path.join(base_dir, 'configs', 'expense_labels.json')

    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    set_seed(config.get('random_seed', 42))

    label_info = load_label_config(labels_path)
    labels = label_info['labels']
    num_classes = len(labels)
    id_to_label = {int(k): v for k, v in label_info['id_to_label'].items()}

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"=== Starting Stage 3: Expense Category Classification Training (EXP_000010) ===")
    print(f"Device: {device}")
    print(f"Model Backbone: {config['model_name']} (Initialized from Stage 1/2 Checkpoint)")

    # 1. Tokenizer & Datasets
    tokenizer = AutoTokenizer.from_pretrained(config['model_name'])

    train_csv = os.path.join(base_dir, 'datasets', 'train', 'expense_category', 'dataset.csv')
    val_csv = os.path.join(base_dir, 'datasets', 'validation', 'expense_category', 'dataset.csv')
    test_csv = os.path.join(base_dir, 'datasets', 'test', 'expense_category', 'dataset.csv')

    train_df = pd.read_csv(train_csv)
    val_df = pd.read_csv(val_csv)
    test_df = pd.read_csv(test_csv)

    print(f"Dataset stats: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    max_len = config.get('max_sequence_length', 128)
    train_dataset = ExpenseCategoryDataset(train_csv, tokenizer, labels_path, max_length=max_len)
    val_dataset = ExpenseCategoryDataset(val_csv, tokenizer, labels_path, max_length=max_len)
    test_dataset = ExpenseCategoryDataset(test_csv, tokenizer, labels_path, max_length=max_len)

    batch_size = config.get('batch_size', 16)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    # Automatically compute class weights for Weighted CrossEntropyLoss
    class_counts = train_df['label'].value_counts()
    weights_list = []
    total_train = len(train_df)
    for lbl in labels:
        count = class_counts.get(lbl, 1)
        w = total_train / (num_classes * count)
        weights_list.append(w)
    class_weights_tensor = torch.tensor(weights_list, dtype=torch.float, device=device)

    print("Automatically Calculated Class Weights:")
    for idx, lbl in enumerate(labels):
        print(f"  - {lbl:<12}: {weights_list[idx]:.4f}")

    # 2. Model Initialization & Stage 1/2 Checkpoint Loading
    encoder = SharedEncoder(config['model_name'], dropout_prob=config.get('dropout', 0.1))
    category_head = ExpenseCategoryHead(hidden_size=encoder.config.hidden_size, num_classes=num_classes, dropout=config.get('dropout', 0.1))

    # Initialize encoder from frozen Stage 1/2 best checkpoint
    enc_best_path = os.path.join(base_dir, 'checkpoints', 'shared_encoder', 'best.pt')
    if os.path.exists(enc_best_path):
        ckpt = torch.load(enc_best_path, map_location=device)
        encoder.load_state_dict(ckpt['model_state_dict'])
        print(f"Successfully initialized Shared Encoder from Stage 1/2 checkpoint: {enc_best_path}")
    else:
        print(f"Warning: {enc_best_path} not found. Training encoder from base pretrained model.")

    encoder.to(device)
    category_head.to(device)

    # 3. Experiment Setup & Tracking
    exp_id = "EXP_000010"
    exp_dir = os.path.join(base_dir, 'experiments', exp_id)
    os.makedirs(exp_dir, exist_ok=True)
    tb_logger = TensorBoardLogger(log_dir=os.path.join(exp_dir, 'logs'))

    # Checkpoint Managers
    ckpt_dir = os.path.join(base_dir, 'checkpoints')
    ckpt_encoder = ModelCheckpoint(os.path.join(ckpt_dir, "shared_encoder"), monitor="val_loss", mode="min")
    ckpt_category = ModelCheckpoint(os.path.join(ckpt_dir, "category_head"), monitor="val_loss", mode="min")

    # Optimizer & Scheduler
    lr = float(config.get('learning_rate', 2e-5))
    weight_decay = float(config.get('weight_decay', 0.01))
    epochs = config.get('epochs', 10)
    total_steps = len(train_loader) * epochs
    warmup_steps = int(total_steps * float(config.get('warmup_ratio', 0.10)))

    params = list(encoder.parameters()) + list(category_head.parameters())
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)
    scheduler = get_scheduler(
        config.get('scheduler', 'linear'),
        optimizer=optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps
    )
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    early_stopping = EarlyStopping(patience=3, mode="min")

    # 4. Training Loop
    history = []
    best_val_loss = float('inf')
    best_epoch = 1
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()

        # Train phase
        encoder.train()
        category_head.train()
        train_loss = 0.0

        for batch in train_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            target_labels = batch['labels'].to(device)

            optimizer.zero_grad()
            _, pooled_output = encoder(input_ids, attention_mask)
            logits = category_head(pooled_output)
            loss = criterion(logits, target_labels)

            loss.backward()
            torch.nn.utils.clip_grad_norm_(params, config.get('gradient_clipping', 1.0))
            optimizer.step()
            scheduler.step()

            train_loss += loss.item()

        avg_train_loss = train_loss / len(train_loader)

        # Validation phase
        encoder.eval()
        category_head.eval()
        val_loss = 0.0
        val_preds = []
        val_targets = []

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                target_labels = batch['labels'].to(device)

                _, pooled_output = encoder(input_ids, attention_mask)
                logits = category_head(pooled_output)
                loss = criterion(logits, target_labels)

                val_loss += loss.item()
                preds = torch.argmax(logits, dim=-1)

                val_preds.extend(preds.cpu().numpy())
                val_targets.extend(target_labels.cpu().numpy())

        avg_val_loss = val_loss / len(val_loader)
        val_acc = accuracy_score(val_targets, val_preds) * 100.0
        epoch_duration = time.time() - epoch_start

        print(f"Epoch {epoch:2d}/{epochs:2d} | Train Category Loss: {avg_train_loss:.4f} | Val Category Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}% | Time: {epoch_duration:.2f}s")

        tb_logger.log_metrics({
            'train_loss': avg_train_loss,
            'val_loss': avg_val_loss,
            'val_accuracy': val_acc
        }, step=epoch)

        history.append({
            'epoch': epoch,
            'train_loss': avg_train_loss,
            'val_loss': avg_val_loss,
            'val_accuracy': val_acc,
            'duration_sec': epoch_duration
        })

        # Save Checkpoints
        is_best = ckpt_category.save(category_head, optimizer, scheduler, epoch, avg_val_loss, config)
        ckpt_encoder.save(encoder, optimizer, scheduler, epoch, avg_val_loss, config)

        if is_best:
            best_val_loss = avg_val_loss
            best_epoch = epoch

        if early_stopping(avg_val_loss):
            print(f"Early stopping triggered at epoch {epoch}")
            break

    total_training_duration = time.time() - start_time
    print(f"Training complete. Best epoch: Epoch {best_epoch} with Val Loss: {best_val_loss:.4f}")

    # Save History CSV
    history_df = pd.DataFrame(history)
    history_df.to_csv(os.path.join(exp_dir, 'history.csv'), index=False)

    # 5. Load Best Model Checkpoint for Held-Out Test Evaluation
    best_head_path = os.path.join(ckpt_dir, 'category_head', 'best.pt')
    best_enc_path = os.path.join(ckpt_dir, 'shared_encoder', 'best.pt')
    if os.path.exists(best_head_path):
        category_head.load_state_dict(torch.load(best_head_path, map_location=device)['model_state_dict'])
    if os.path.exists(best_enc_path):
        encoder.load_state_dict(torch.load(best_enc_path, map_location=device)['model_state_dict'])

    encoder.eval()
    category_head.eval()

    # 6. Evaluation on Held-Out Test Dataset
    print("\nEvaluating Expense Category Classification on Held-Out Test Set...")
    test_loss = 0.0
    test_preds = []
    test_targets = []
    test_probs = []
    test_texts = []

    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            target_labels = batch['labels'].to(device)

            _, pooled_output = encoder(input_ids, attention_mask)
            logits = category_head(pooled_output)
            loss = criterion(logits, target_labels)

            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(logits, dim=-1)

            test_loss += loss.item()
            test_preds.extend(preds.cpu().numpy())
            test_targets.extend(target_labels.cpu().numpy())
            test_probs.extend(probs.cpu().numpy())
            test_texts.extend(batch['text'])

    avg_test_loss = test_loss / len(test_loader)
    test_acc = accuracy_score(test_targets, test_preds) * 100.0

    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(test_targets, test_preds, average='macro')
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(test_targets, test_preds, average='weighted')

    per_class_p, per_class_r, per_class_f1, per_class_sup = precision_recall_fscore_support(test_targets, test_preds, average=None)

    # 7. Generate Classification Report & Misclassified Samples CSV
    cls_report_str = classification_report(test_targets, test_preds, target_names=labels, digits=4)
    with open(os.path.join(exp_dir, 'classification_report.txt'), 'w', encoding='utf-8') as f:
        f.write(f"EXPENSE CATEGORY CLASSIFICATION REPORT ({exp_id})\n")
        f.write("=" * 60 + "\n")
        f.write(cls_report_str)

    # Misclassified samples
    misclassified = []
    for txt, true_lbl, pred_lbl, prob in zip(test_texts, test_targets, test_preds, test_probs):
        if true_lbl != pred_lbl:
            misclassified.append({
                'text': txt,
                'true_label': id_to_label[true_lbl],
                'predicted_label': id_to_label[pred_lbl],
                'confidence': float(prob[pred_lbl])
            })
    mis_df = pd.DataFrame(misclassified)
    mis_df.to_csv(os.path.join(exp_dir, 'misclassified_samples.csv'), index=False)

    # 8. Generate Visual Charts via Pillow
    cm = confusion_matrix(test_targets, test_preds)
    generate_confusion_matrix_png(cm, labels, os.path.join(exp_dir, 'confusion_matrix.png'))
    generate_line_chart_png(history, os.path.join(exp_dir, 'training_curves.png'))
    generate_roc_curve_png(test_targets, test_probs, labels, os.path.join(exp_dir, 'roc_curve.png'))
    generate_pr_curve_png(test_targets, test_probs, labels, os.path.join(exp_dir, 'precision_recall_curve.png'))

    # 9. Target Acceptance Verification
    pass_acc = test_acc >= 97.0
    pass_macro_f1 = (f1_macro * 100.0) >= 96.0
    pass_weighted_f1 = (f1_weighted * 100.0) >= 97.0
    stage_3_passed = pass_acc and pass_macro_f1 and pass_weighted_f1

    # 10. Update Experiment Registries & Metrics
    metrics_summary = {
        "experiment_id": exp_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "stage": "Stage 3 - Expense Category Classification",
        "best_epoch": best_epoch,
        "training_duration_sec": total_training_duration,
        "test_loss": float(avg_test_loss),
        "test_accuracy": float(test_acc),
        "precision_macro": float(p_macro * 100.0),
        "recall_macro": float(r_macro * 100.0),
        "macro_f1": float(f1_macro * 100.0),
        "precision_weighted": float(p_weighted * 100.0),
        "recall_weighted": float(r_weighted * 100.0),
        "weighted_f1": float(f1_weighted * 100.0),
        "per_category_metrics": {
            labels[i]: {
                "precision": float(per_class_p[i] * 100.0),
                "recall": float(per_class_r[i] * 100.0),
                "f1": float(per_class_f1[i] * 100.0),
                "support": int(per_class_sup[i])
            } for i in range(num_classes)
        },
        "acceptance_status": "PASSED" if stage_3_passed else "FAILED"
    }

    with open(os.path.join(exp_dir, 'metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(metrics_summary, f, indent=2)

    # Markdown Training Report
    with open(os.path.join(exp_dir, 'training_report.md'), 'w', encoding='utf-8') as f:
        f.write(f"# Training Report: Stage 3 Expense Category Classification ({exp_id})\n\n")
        f.write(f"- **Accuracy**: {test_acc:.2f}%\n")
        f.write(f"- **Macro F1**: {f1_macro*100.0:.2f}%\n")
        f.write(f"- **Weighted F1**: {f1_weighted*100.0:.2f}%\n")
        f.write(f"- **Status**: {'PASSED' if stage_3_passed else 'FAILED'}\n")

    # Update model_registry.json
    registry_path = os.path.join(base_dir, 'experiments', 'model_registry.json')
    if os.path.exists(registry_path):
        with open(registry_path, 'r', encoding='utf-8') as f:
            reg_data = json.load(f)
    else:
        reg_data = {}

    reg_data['expense'] = {
        "status": "production_ready" if stage_3_passed else "candidate",
        "best_experiment": exp_id,
        "accuracy": float(test_acc),
        "macro_f1": float(f1_macro * 100.0),
        "weighted_f1": float(f1_weighted * 100.0),
        "checkpoint": "checkpoints/category_head/best.pt",
        "encoder_checkpoint": "checkpoints/shared_encoder/best.pt"
    }

    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(reg_data, f, indent=2)

    # Update metadata/shared_mobilebert.json
    meta_path = os.path.join(base_dir, 'metadata', 'shared_mobilebert.json')
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta_data = json.load(f)
        if 'stages' not in meta_data:
            meta_data['stages'] = {}
        meta_data['stages']['stage_3_expense'] = {
            "experiment": exp_id,
            "status": "completed",
            "test_accuracy": float(test_acc),
            "macro_f1": float(f1_macro * 100.0),
            "weighted_f1": float(f1_weighted * 100.0)
        }
        meta_data['stage_3_status'] = "PASSED" if stage_3_passed else "FAILED"
        meta_data['latest_expense_experiment'] = exp_id
        if 'Expense Category Classification' not in meta_data.get('supported_tasks', []):
            meta_data.setdefault('supported_tasks', []).append('Expense Category Classification')
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, indent=2)

    # Update experiment_index.json
    exp_idx_path = os.path.join(base_dir, 'experiments', 'experiment_index.json')
    if os.path.exists(exp_idx_path):
        with open(exp_idx_path, 'r', encoding='utf-8') as f:
            exp_idx_data = json.load(f)
    else:
        exp_idx_data = {"experiments": []}
    exp_idx_data["experiments"].append({
        "experiment_id": exp_id,
        "task": "expense_category",
        "model": "Shared MobileBERT + ExpenseCategoryHead",
        "accuracy": float(test_acc),
        "f1": float(f1_weighted * 100.0),
        "date": time.strftime("%Y-%m-%d", time.gmtime())
    })
    with open(exp_idx_path, 'w', encoding='utf-8') as f:
        json.dump(exp_idx_data, f, indent=2)

    # 11. Final Console Print (All 15 required sections)
    print("\n" + "=" * 70)
    print("      STAGE 3: EXPENSE CATEGORY CLASSIFICATION RESULTS (EXP_000010)")
    print("=" * 70)
    print(f"1. Dataset Summary:")
    print(f"   - Train Samples: {len(train_df)} | Val Samples: {len(val_df)} | Test Samples: {len(test_df)}")

    print(f"\n2. Category Distribution:")
    for lbl in labels:
        print(f"   - {lbl:<12}: {class_counts.get(lbl, 0)} train samples")

    print(f"\n3. Training Configuration:")
    print(f"   - Experiment ID: {exp_id}")
    print(f"   - Backbone: {config['model_name']} (Initialized from Stage 1/2 Best Checkpoint)")
    print(f"   - Optimizer: AdamW, LR: {lr}, Batch Size: {batch_size}, Epochs: {epochs}")

    print(f"\n4. Best Epoch: Epoch {best_epoch}")
    print(f"5. Training Duration: {total_training_duration:.2f} seconds ({total_training_duration/60:.2f} minutes)")

    print(f"\n6. Overall Accuracy:   {test_acc:.2f}%  (Target: >= 97.0%) -> {'PASSED' if pass_acc else 'FAILED'}")
    print(f"7. Precision (Macro):  {p_macro*100.0:.2f}%  |  (Weighted): {p_weighted*100.0:.2f}%")
    print(f"8. Recall (Macro):     {r_macro*100.0:.2f}%  |  (Weighted): {r_weighted*100.0:.2f}%")
    print(f"9. Macro F1:           {f1_macro*100.0:.2f}%  (Target: >= 96.0%) -> {'PASSED' if pass_macro_f1 else 'FAILED'}")
    print(f"10. Weighted F1:       {f1_weighted*100.0:.2f}%  (Target: >= 97.0%) -> {'PASSED' if pass_weighted_f1 else 'FAILED'}")

    print(f"\n11. Per-Category Metrics Breakdown:")
    print(f"   {'Category':<15} | {'Precision':<10} | {'Recall':<10} | {'F1 Score':<10} | {'Support':<8}")
    print("   " + "-" * 62)
    for i, lbl in enumerate(labels):
        print(f"   {lbl:<15} | {per_class_p[i]*100.0:9.2f}% | {per_class_r[i]*100.0:9.2f}% | {per_class_f1[i]*100.0:9.2f}% | {per_class_sup[i]:<8}")

    print(f"\n12. Confusion Matrix Summary:")
    print(f"   - Total Test Evaluation Samples: {len(test_df)}")
    print(f"   - Total Correct Classifications: {np.trace(cm)} / {len(test_df)}")
    print(f"   - Total Misclassifications: {len(misclassified)}")

    print(f"\n13. Misclassified Sample Analysis:")
    print(f"   - Total Test Misclassifications: {len(misclassified)} out of {len(test_df)}")
    if misclassified:
        print("   - Sample Misclassified Examples:")
        for m in misclassified[:3]:
            print(f"     * Text: \"{m['text'][:60]}...\"")
            print(f"       True: {m['true_label']} -> Predicted: {m['predicted_label']} (Conf: {m['confidence']:.4f})")

    print(f"\n14. Stage 3 Acceptance Status:")
    if stage_3_passed:
        print(f"   >>> STAGE 3 STATUS: PASSED! All Accuracy, Macro F1, and Weighted F1 targets HAVE BEEN ACHIEVED.")
    else:
        print(f"   >>> STAGE 3 STATUS: FAILED. Target metrics were not fully achieved.")

    print(f"\n15. Production Expense Category Model Decision:")
    if stage_3_passed:
        print(f"   >>> YES! EXP_000010 meets all acceptance criteria and is promoted as the production Expense Category model.")
    else:
        print(f"   >>> NO. EXP_000010 did not meet target metrics.")
    print("=" * 70)

if __name__ == '__main__':
    run_stage_3_expense_category()

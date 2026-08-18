import os
import sys
import json

def validate_spendguard_project():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    checks = []
    
    def check_file(rel_path: str, description: str):
        abs_p = os.path.join(base_dir, rel_path)
        exists = os.path.isfile(abs_p)
        checks.append({"item": description, "path": rel_path, "status": "PASS" if exists else "FAIL"})
        return exists

    def check_dir(rel_path: str, description: str):
        abs_p = os.path.join(base_dir, rel_path)
        exists = os.path.isdir(abs_p)
        checks.append({"item": description, "path": rel_path, "status": "PASS" if exists else "FAIL"})
        return exists

    # 1. Registries & Indices
    check_file("datasets/registry.json", "Dataset Registry")
    check_file("experiments/model_registry.json", "Model Registry")
    check_file("experiments/experiment_index.json", "Experiment Index")
    check_file("models/versions.json", "Model Version History")
    check_file("integrity/checksums.json", "Integrity Checksums")
    check_file("deployment_manifest.json", "Deployment Manifest")

    # 2. Metadata Files
    check_file("metadata/shared_mobilebert.json", "Metadata: Shared MobileBERT")
    check_file("metadata/expense_classifier.json", "Metadata: Expense Classifier")

    # 3. YAML Configurations
    check_file("training/shared_mobilebert/configs/shared_mobilebert.yaml", "YAML: Shared MobileBERT")
    check_file("training/expense_classifier/configs/expense_classifier.yaml", "YAML: Expense Classifier")

    # 4. JSON Label Taxonomy Files
    check_file("configs/classification_labels.json", "Labels: Classification")
    check_file("configs/ner_labels.json", "Labels: NER")
    check_file("configs/expense_labels.json", "Labels: Expense Category")

    # 5. Required Folders
    check_dir("datasets/processed", "Folder: Processed Datasets")
    check_dir("experiments/shared_mobilebert", "Folder: MobileBERT Experiments")
    check_dir("experiments/expense_classifier", "Folder: Expense Experiments")
    check_dir("releases/v1.0.0", "Folder: Release v1.0.0")
    check_dir("benchmarks/latency", "Folder: Benchmark Latency")
    check_dir("evaluation/classification", "Folder: Evaluation Classification")
    check_dir("analysis/classification_errors", "Folder: Error Analysis")
    check_dir("compatibility", "Folder: Compatibility")

    # 6. Checkpoint Folders
    check_dir("checkpoints/shared_encoder", "Checkpoint: Shared Encoder")
    check_dir("checkpoints/classification_head", "Checkpoint: Classification Head")
    check_dir("checkpoints/ner_head", "Checkpoint: NER Head")
    check_dir("checkpoints/expense_classifier", "Checkpoint: Expense Classifier")

    # Print validation report
    print("=" * 60)
    print("      SPENDGUARD AI PROJECT VALIDATION REPORT")
    print("=" * 60)
    
    failed = 0
    for c in checks:
        symbol = "[PASS]" if c["status"] == "PASS" else "[FAIL]"
        print(f" {symbol} {c['item']} -> {c['path']}")
        if c["status"] == "FAIL":
            failed += 1
            
    print("=" * 60)
    if failed == 0:
        print(" OVERALL STATUS: PASS (All project components validated successfully)")
        print("=" * 60)
        return 0
    else:
        print(f" OVERALL STATUS: FAIL ({failed} component(s) missing or broken)")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(validate_spendguard_project())

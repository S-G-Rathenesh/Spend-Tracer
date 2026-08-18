import os
import hashlib
import json

def get_file_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def generate_integrity_checksums():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dirs = ['configs', 'metadata', 'datasets/processed', 'datasets/raw']
    
    checksums = {
        "generated_at": os.popen('python -c "from datetime import datetime; print(datetime.utcnow().isoformat())"').read().strip() + "Z",
        "files": {}
    }
    
    for rel_dir in target_dirs:
        abs_dir = os.path.join(base_dir, rel_dir)
        if not os.path.exists(abs_dir):
            continue
            
        for root, _, files in os.walk(abs_dir):
            for file in files:
                if file.endswith(('.json', '.csv', '.yaml', '.bio', '.iob2')):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, base_dir).replace('\\', '/')
                    checksums["files"][rel_path] = get_file_sha256(full_path)
                    
    out_path = os.path.join(base_dir, 'integrity', 'checksums.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(checksums, f, indent=2)
        
    print(f"Successfully generated SHA-256 checksums for {len(checksums['files'])} files in {out_path}")

if __name__ == "__main__":
    generate_integrity_checksums()

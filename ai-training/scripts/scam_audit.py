import os
import pandas as pd
import re
from collections import Counter
import json

SECURITY_KEYWORDS = [
    'bank', 'account', 'verify', 'verification', 'kyc', 'otp', 'password', 'pin',
    'credit card', 'debit card', 'upi', 'wallet', 'refund', 'blocked', 'suspended',
    'payment failed', 'security', 'authentication', 'login', 'click here', 'reset'
]

def get_ngrams(text, n=2):
    words = text.lower().split()
    ngrams = zip(*[words[i:] for i in range(n)])
    return [" ".join(ngram) for ngram in ngrams]

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    final_csv = os.path.join(base_dir, 'datasets', 'final', 'classification.csv')
    review_dir = os.path.join(base_dir, 'datasets', 'review')
    
    if not os.path.exists(final_csv):
        print(f"Error: {final_csv} not found.")
        return
        
    df = pd.read_csv(final_csv)
    
    # 1. SCAM AUDIT
    df_scam = df[df['label'] == 'Scam'].copy()
    total_scam = len(df_scam)
    
    avg_len_scam = df_scam['text'].astype(str).apply(len).mean() if total_scam > 0 else 0
    
    # Tokenize words for top 100
    all_scam_text = " ".join(df_scam['text'].dropna().astype(str).tolist()).lower()
    words = re.findall(r'\b\w+\b', all_scam_text)
    
    # Exclude basic stop words to make it useful
    stop_words = {'the', 'to', 'and', 'a', 'of', 'in', 'is', 'for', 'you', 'on', 'your', 'with', 'this', 'that', 'it', 'at', 'be', 'are', 'as', 'will'}
    words = [w for w in words if w not in stop_words]
    
    word_counts = Counter(words)
    top_100_words = word_counts.most_common(100)
    
    # Frequent phrases (bigrams and trigrams)
    bigrams = []
    trigrams = []
    for text in df_scam['text'].dropna().astype(str):
        clean_str = re.sub(r'[^\w\s]', '', text.lower())
        bigrams.extend(get_ngrams(clean_str, 2))
        trigrams.extend(get_ngrams(clean_str, 3))
        
    top_phrases = Counter(bigrams).most_common(10) + Counter(trigrams).most_common(10)
    
    report = {
        "total_scam_messages": total_scam,
        "average_scam_length": round(avg_len_scam, 2),
        "top_100_words": {word: count for word, count in top_100_words},
        "frequent_phrases": {phrase: count for phrase, count in top_phrases}
    }
    
    # 2. PROMOTION AUDIT
    df_promo = df[df['label'] == 'Promotion'].copy()
    
    def matches_security_keywords(text):
        text_lower = str(text).lower()
        for kw in SECURITY_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return True
        return False
        
    df_promo['is_mislabeled_candidate'] = df_promo['text'].apply(matches_security_keywords)
    
    df_mislabeled = df_promo[df_promo['is_mislabeled_candidate']].copy()
    
    mislabeled_path = os.path.join(review_dir, 'potential_scam_mislabeled.csv')
    df_mislabeled[['text', 'label']].to_csv(mislabeled_path, index=False)
    
    mislabeled_count = len(df_mislabeled)
    report["potential_scam_mislabeled_in_promotion"] = mislabeled_count
    report["promotion_messages_total"] = len(df_promo)
    
    print("Scam Quality Audit Complete")
    print(json.dumps(report, indent=2))
    print(f"\nSaved {mislabeled_count} messages to {mislabeled_path} for manual review.")

if __name__ == "__main__":
    main()

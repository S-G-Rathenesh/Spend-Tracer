import os
import pandas as pd
import re
import json

PROMOTION_KEYWORDS = [
    'offer', 'offers', 'discount', 'sale', 'cashback', 'coupon', 'deal', 'deals',
    'shopping', 'shop', 'buy now', 'limited time', 'limited offer', 'free delivery', 
    'gift', 'voucher', 'promo', 'festival', 'amazon', 'flipkart', 'myntra', 
    'swiggy', 'zomato', 'dominos', 'pizza', 'restaurant', 'reward', 'points', 
    'membership', 'subscription', 'upgrade', 'special price', 'book now', 
    'travel', 'hotel', 'flight', 'movie', 'ticket', 'food', 'delivery', 
    'uber', 'ola', 'netflix', 'spotify', '% off', 'flat off', 'save', 'exclusive',
    'win', 'bonus', 'free', 'data', 'gb', 'mb', 'subscribe', 'rs.'
]

SCAM_KEYWORDS = [
    'kyc', 'otp', 'password', 'pin', 'verify your account', 'account blocked', 
    'account suspended', 'update account', 'kyc update', 'pan update', 
    'aadhaar update', 'click here', 'click the link', 'open the link', 
    'claim your prize', 'claim prize', 'you are a winner', 'payment failed', 
    'reset password', 'urgent action', 'fraud alert', 'security alert', 
    'income tax refund', 'bank account', 'credit card blocked', 'debit card blocked', 
    'wallet blocked', 'upi pin', 'reactivate account', 'activate your account',
    'verify', 'verification', 'suspended', 'blocked', 'refund', 'lottery', 'winner',
    'fraud', 'authentication', 'immediately'
]

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    # Ensure UTF-8 decoding by ignoring corrupted bytes if any
    text = text.encode('utf-8', 'ignore').decode('utf-8')
    # Normalize line endings and trim whitespace
    text = re.sub(r'[\r\n]+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def label_spam(text):
    text_lower = text.lower()
    
    promo_matches = [kw for kw in PROMOTION_KEYWORDS if re.search(r'\b' + re.escape(kw) + r'\b', text_lower)]
    scam_matches = [kw for kw in SCAM_KEYWORDS if re.search(r'\b' + re.escape(kw) + r'\b', text_lower)]
    
    is_promo = len(promo_matches) > 0
    is_scam = len(scam_matches) > 0
    
    if is_promo and is_scam:
        return 'REVIEW', 'Promotion, Scam'
    elif is_scam:
        return 'Scam', 'Scam'
    else:
        # Default to Promotion if it's spam but doesn't match Scam keywords
        # and doesn't explicitly match BOTH.
        return 'Promotion', 'Promotion'

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sms_path = os.path.join(base_dir, 'datasets', 'raw', 'sms_classification', 'combined_dataset.csv')
    review_dir = os.path.join(base_dir, 'datasets', 'review')
    final_dir = os.path.join(base_dir, 'datasets', 'final')
    
    os.makedirs(review_dir, exist_ok=True)
    os.makedirs(final_dir, exist_ok=True)
    
    # 1. Load SMS Dataset
    df = pd.read_csv(sms_path)
    
    # Validation / Cleaning
    df['text'] = df['text'].apply(clean_text)
    df = df[df['text'] != ""]
    df = df.dropna(subset=['target', 'text'])
    df = df[df['target'].isin(['ham', 'spam'])]
    
    len_before = len(df)
    df = df.drop_duplicates(subset=['text'])
    duplicates_removed = len_before - len(df)
    
    # 2. Base mapping
    # Note: df has columns 'target' and 'text'. We map 'target' to 'label'
    df['label'] = df['target'].map({'ham': 'Personal'})
    
    # 3. Apply keyword logic to spam
    spam_mask = df['target'] == 'spam'
    
    # Vectorized apply for spam rules
    spam_results = df.loc[spam_mask, 'text'].apply(label_spam)
    if not spam_results.empty:
        df.loc[spam_mask, 'label'] = spam_results.apply(lambda x: x[0])
        df.loc[spam_mask, 'matched_keywords'] = spam_results.apply(lambda x: x[1])
    else:
        df['matched_keywords'] = None
    
    # 4. Check for corrected_labels.csv and apply overrides
    corrected_path = os.path.join(review_dir, 'corrected_labels.csv')
    if os.path.exists(corrected_path):
        df_corr = pd.read_csv(corrected_path)
        if 'text' in df_corr.columns and 'label' in df_corr.columns:
            # Drop duplicates in corrected labels just in case
            df_corr = df_corr.drop_duplicates(subset=['text'])
            # Merge to override
            df = df.merge(df_corr[['text', 'label']], on='text', how='left', suffixes=('', '_corr'))
            df['label'] = df['label_corr'].combine_first(df['label'])
            df.drop(columns=['label_corr'], inplace=True)
            # Clear matched keywords if corrected
            df.loc[df['label'].isin(['Personal', 'Promotion', 'Scam', 'Transaction']), 'matched_keywords'] = None
            
    # 5. Extract REVIEW messages
    review_mask = df['label'] == 'REVIEW'
    df_review = df[review_mask].copy()
    
    if not df_review.empty:
        df_review['Reason'] = "Matched both Promotion and Scam keywords"
        df_review.loc[df_review['matched_keywords'] == 'None', 'Reason'] = "Matched no keywords"
        df_review = df_review.rename(columns={'text': 'SMS text', 'label': 'Suggested label', 'matched_keywords': 'Matched keywords'})
        df_review[['SMS text', 'Suggested label', 'Matched keywords', 'Reason']].to_csv(
            os.path.join(review_dir, 'review_messages.csv'), index=False
        )
    else:
        # Create empty file
        pd.DataFrame(columns=['SMS text', 'Suggested label', 'Matched keywords', 'Reason']).to_csv(
            os.path.join(review_dir, 'review_messages.csv'), index=False
        )
        
    # 6. Prepare Final valid datasets
    df_valid_sms = df[df['label'].isin(['Personal', 'Promotion', 'Scam'])].copy()
    
    # Load Bank Dataset
    bank_path = os.path.join(base_dir, 'datasets', 'processed', 'bank_transactions.csv')
    if os.path.exists(bank_path):
        df_bank = pd.read_csv(bank_path)
    else:
        print("Bank transactions not found in processed. Creating empty.")
        df_bank = pd.DataFrame(columns=['text', 'label'])
        
    df_final = pd.concat([df_valid_sms[['text', 'label']], df_bank[['text', 'label']]], ignore_index=True)
    df_final['label'] = df_final['label'].replace({'transaction': 'Transaction'})
    df_final = df_final.drop_duplicates(subset=['text'])
    
    # 6.5 Incorporate scam_dataset.csv
    scam_ext_path = os.path.join(base_dir, 'datasets', 'raw', 'sms_classification', 'scam_dataset.csv')
    previous_scam_count = len(df_final[df_final['label'] == 'Scam'])
    new_scams_added = 0
    duplicate_scams_removed = 0
    
    if os.path.exists(scam_ext_path):
        df_ext = pd.read_csv(scam_ext_path)
        # Assuming columns might be Class and Message
        if 'Message' in df_ext.columns and 'Class' in df_ext.columns:
            df_ext = df_ext.rename(columns={'Message': 'text', 'Class': 'label'})
        
        df_ext['text'] = df_ext['text'].apply(clean_text)
        df_ext = df_ext[df_ext['text'] != ""]
        df_ext = df_ext.dropna(subset=['text'])
        df_ext['label'] = 'Scam'
        
        # Deduplicate internally first
        df_ext = df_ext.drop_duplicates(subset=['text'])
        
        # Track duplicates against existing
        existing_texts = set(df_final['text'])
        df_ext_unique = df_ext[~df_ext['text'].isin(existing_texts)]
        
        duplicate_scams_removed = len(df_ext) - len(df_ext_unique)
        new_scams_added = len(df_ext_unique)
        
        df_final = pd.concat([df_final, df_ext_unique[['text', 'label']]], ignore_index=True)

    # 7. Generate datasets/final/classification.csv
    df_final.to_csv(os.path.join(final_dir, 'classification.csv'), index=False)
    
    # 8. Generate Reports
    total_len = len(df_final)
    class_dist = df_final['label'].value_counts().to_dict()
    
    avg_length = df_final.groupby('label')['text'].apply(lambda x: x.str.len().mean()).round(2).to_dict()
    
    all_words = ' '.join(df_final['text'].astype(str).tolist()).lower().split()
    vocab_size = len(set(all_words))
    
    review_count = len(df_review)
    promo_count = class_dist.get('Promotion', 0)
    scam_count = class_dist.get('Scam', 0)
    
    stats = {
        "Overall dataset statistics": total_len,
        "Class distribution": class_dist,
        "Average SMS length": avg_length,
        "Vocabulary size": vocab_size,
        "Duplicate count": duplicates_removed,
        "Number of REVIEW messages": review_count,
        "Number of Promotion messages": promo_count,
        "Number of Scam messages": scam_count,
        "Scam Integration": {
            "Previous Scam count": previous_scam_count,
            "Newly added Scam messages": new_scams_added,
            "Duplicate Scam messages removed": duplicate_scams_removed,
            "Final Scam count": class_dist.get('Scam', 0)
        }
    }
    
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    main()

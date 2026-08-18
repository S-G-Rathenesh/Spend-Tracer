import pandas as pd

def undersample(df, target_size=None):
    """Randomly removes samples from majority classes."""
    if 'label' not in df.columns:
        return df
    if target_size is None:
        target_size = df['label'].value_counts().min()
    return df.groupby('label').sample(n=target_size, replace=False, random_state=42)

def oversample(df, target_size=None):
    """Randomly duplicates samples from minority classes."""
    if 'label' not in df.columns:
        return df
    if target_size is None:
        target_size = df['label'].value_counts().max()
    return df.groupby('label').sample(n=target_size, replace=True, random_state=42)

def weighted_sample(df, weights_dict, n_samples):
    """Samples data based on custom class weights."""
    if 'label' not in df.columns:
        return df
    weights = df['label'].map(weights_dict)
    return df.sample(n=n_samples, weights=weights, replace=True, random_state=42)

if __name__ == "__main__":
    print("dataset_balancer utilities ready. Note: Do NOT balance yet as per instructions.")

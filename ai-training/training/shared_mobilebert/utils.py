def format_structured_transaction(ner_output_dict):
    """
    Takes raw NER output and formats it for the Expense Classifier.
    Expected output structure for the pipeline.
    """
    return {
        "amount": ner_output_dict.get("AMOUNT", ""),
        "currency": ner_output_dict.get("CURRENCY", ""),
        "merchant": ner_output_dict.get("MERCHANT", ""),
        "bank": ner_output_dict.get("BANK", ""),
        "mode": ner_output_dict.get("MODE", ""),
        "reference": ner_output_dict.get("REFERENCE", ""),
        "account_suffix": ner_output_dict.get("ACCOUNT_SUFFIX", ""),
        "date": ner_output_dict.get("DATE", ""),
        "transaction_type": ner_output_dict.get("TRANSACTION_TYPE", "")
    }

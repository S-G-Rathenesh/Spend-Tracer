export const SMSConstants = {
  BANK_SENDER_PATTERNS: [/^[A-Za-z]{2}-?[A-Za-z0-9]{4,6}$/], // Typical Indian bank SMS headers
  DEBIT_KEYWORDS: ['debited', 'deducted', 'spent', 'sent to', 'paid'],
  CREDIT_KEYWORDS: ['credited', 'received', 'added', 'refunded'],
  SCAM_KEYWORDS: ['urgent', 'blocked', 'kyc', 'reward', 'click here', 'claim', 'suspend', 'pan'],
};

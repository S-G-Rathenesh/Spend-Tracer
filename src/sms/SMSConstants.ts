export const SUPPORTED_BANKS = [
  'SBI', 'HDFC', 'ICICI', 'AXIS', 'CANARA', 'INDIAN', 'IOB', 'PNB', 
  'KOTAK', 'IDFC', 'FEDERAL', 'UNION', 'BOB'
];

export const BANK_SENDER_PATTERNS = [
  /^[A-Za-z]{2}-?(SBI|HDFC|ICICI|AXIS|CANARA|INDIAN|IOB|PNB|KOTAK|IDFC|FEDERAL|UNION|BOB)[A-Za-z0-9]*$/i,
  /^[A-Za-z]{2}-?.*(BANK|BK|BOK|HDFCBK|ICICIB).*$/i
];

export const NON_TRANSACTION_KEYWORDS = [
  'otp', 'one time password', 'verification code', 'code is',
  'promotional', 'loan offer', 'credit card offer', 'dear customer, avail',
  'click here', 'download the app'
];

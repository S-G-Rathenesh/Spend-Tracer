export const Schema = {
  users: `
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `,
  transactions: `
    CREATE TABLE IF NOT EXISTS Transactions (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      merchantId TEXT,
      bank TEXT,
      categoryId TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      referenceNumber TEXT,
      transactionType TEXT,
      notes TEXT,
      source TEXT NOT NULL,
      needsVerification INTEGER DEFAULT 0,
      sources TEXT,
      smsHash TEXT UNIQUE,
      originalSms TEXT,
      aiCategory TEXT,
      aiConfidence REAL,
      userCategory TEXT,
      finalCategory TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(merchantId) REFERENCES MerchantCache(id),
      FOREIGN KEY(categoryId) REFERENCES Categories(id)
    );
  `,
  categories: `
    CREATE TABLE IF NOT EXISTS Categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `,
  merchantCache: `
    CREATE TABLE IF NOT EXISTS MerchantCache (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      categoryId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(categoryId) REFERENCES Categories(id)
    );
  `,
  scamHistory: `
    CREATE TABLE IF NOT EXISTS ScamHistory (
      id TEXT PRIMARY KEY,
      smsBody TEXT NOT NULL,
      confidence REAL NOT NULL,
      reason TEXT,
      scamType TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS Settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `,
  incomingSMS: `
    CREATE TABLE IF NOT EXISTS IncomingSMS (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      receivedAt TEXT NOT NULL,
      normalizedText TEXT,
      bank TEXT,
      isProcessed INTEGER DEFAULT 0,
      processingStatus TEXT NOT NULL,
      predictedClass TEXT,
      confidence REAL,
      reasons TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `,
  merchantCategoryMapping: `
    CREATE TABLE IF NOT EXISTS MerchantCategoryMapping (
      id TEXT PRIMARY KEY,
      merchant_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      category TEXT NOT NULL,
      upi_id TEXT,
      account_identifier TEXT,
      sms_hash TEXT,
      sender TEXT,
      confidence REAL DEFAULT 1.0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `
};

export const Indexes = [
  'CREATE INDEX IF NOT EXISTS idx_transactions_date ON Transactions(date);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_type ON Transactions(type);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_category ON Transactions(categoryId);',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_smshash ON Transactions(smsHash);',
  `CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON Transactions(merchantId);`,
  `CREATE INDEX IF NOT EXISTS idx_scamhistory_date ON ScamHistory(date);`,
  `CREATE INDEX IF NOT EXISTS idx_incomingsms_status ON IncomingSMS(processingStatus);`,
  `CREATE INDEX IF NOT EXISTS idx_merchantmapping_norm ON MerchantCategoryMapping(normalized_name);`,
  `CREATE INDEX IF NOT EXISTS idx_merchantmapping_upi ON MerchantCategoryMapping(upi_id);`,
  `CREATE INDEX IF NOT EXISTS idx_merchantmapping_smshash ON MerchantCategoryMapping(sms_hash);`
];


export class HashUtils {
  /**
   * Creates a canonical identity for an SMS transaction.
   * Normalizes the inputs to ensure LIVE SMS and Auto Sync produce identical hashes.
   */
  static createCanonicalSmsIdentity(
    sender: string,
    body: string,
    timestamp: number | string,
    amount: string | number,
    type: string,
    referenceNumber?: string,
    merchant?: string
  ): string {
    // 1. Normalize Sender (remove non-alphanumeric, lowercase)
    const normSender = (sender || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // 2. Normalize Body (remove all whitespace, newlines, convert to lowercase)
    const normBody = (body || '').replace(/\s+/g, '').toLowerCase();

    // 3. Normalize Timestamp to Date (YYYY-MM-DD) to tolerate millisecond/second differences
    const dateStr = new Date(Number(timestamp)).toISOString().split('T')[0];

    // 4. Extract other core identity elements
    const normAmount = Number(amount || 0).toString();
    const normType = (type || 'Unknown').toLowerCase();
    const normRef = (referenceNumber || '').toLowerCase().trim();
    const normMerchant = (merchant || '').toLowerCase().trim();

    // 5. Combine into a stable input string
    const input = `${normSender}|${normBody}|${dateStr}|${normAmount}|${normType}|${normRef}|${normMerchant}`;

    // 6. Generate 53-bit cyrb53 hash
    let h1 = 0xdeadbeef ^ input.length, h2 = 0x41c6ce57 ^ input.length;
    for (let i = 0, ch; i < input.length; i++) {
        ch = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1>>>0);
    return hash.toString(16);
  }

  /**
   * Fast cyrb53 hash for arbitrary strings.
   */
  static fastHash(str: string): string {
    let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1>>>0);
    return hash.toString(16);
  }
}

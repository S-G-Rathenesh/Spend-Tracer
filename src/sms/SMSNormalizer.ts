export class SMSNormalizer {
  static normalize(text: string): string {
    if (!text) return '';
    let normalized = text;
    
    // Convert to uppercase for consistency in AI parsing
    normalized = normalized.toUpperCase();
    
    // Replace multiple spaces/newlines with a single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Normalize currency symbols
    normalized = normalized.replace(/INR/g, 'RS.');
    normalized = normalized.replace(/RS\s+/g, 'RS.');
    
    // Remove invisible unicode characters
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return normalized.trim();
  }
}

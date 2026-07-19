export class SMSValidator {
  static validate(message: string): boolean {
    if (!message || message.length < 10) return false;
    
    // Additional validation logic can be added here
    // e.g. checking for corrupted encoding, weird characters, etc.
    
    return true;
  }
}

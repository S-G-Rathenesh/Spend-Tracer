export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static isValidPassword(password: string): boolean {
    return password.length >= 8;
  }
}

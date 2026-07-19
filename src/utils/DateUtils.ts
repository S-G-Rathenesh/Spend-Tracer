export class DateUtils {
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  static getCurrentISODate(): string {
    return new Date().toISOString();
  }
}

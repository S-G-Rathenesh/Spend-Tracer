// Placeholder for StorageUtils if needed in future
export class StorageUtils {
  private static memoryStore = new Map<string, string>();

  static async setItem(key: string, value: string): Promise<void> {
    this.memoryStore.set(key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    return this.memoryStore.get(key) || null;
  }

  static async removeItem(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }
}

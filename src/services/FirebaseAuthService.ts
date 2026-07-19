import auth from '@react-native-firebase/auth';

export class FirebaseAuthService {
  static async login(email: string, password: string) {
    try {
      const result = await auth().signInWithEmailAndPassword(email, password);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async register(email: string, password: string) {
    try {
      const result = await auth().createUserWithEmailAndPassword(email, password);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async forgotPassword(email: string) {
    try {
      await auth().sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async logout() {
    try {
      await auth().signOut();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

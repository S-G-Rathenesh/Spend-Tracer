import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

  static async loginWithGoogle() {
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token and Access token
      const signInResult = await GoogleSignin.signIn();
      const { idToken, accessToken } = await GoogleSignin.getTokens();
      
      if (!idToken) {
        throw new Error('No ID token found');
      }

      // Create a Google credential with both tokens
      const googleCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);

      // Sign-in the user with the credential
      const result = await auth().signInWithCredential(googleCredential);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async logout() {
    try {
      await auth().signOut();
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if not signed in with Google
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

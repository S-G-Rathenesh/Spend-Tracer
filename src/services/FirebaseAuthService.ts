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

  static async deleteAccount() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return { success: false, error: 'No user is currently signed in.' };
      }

      // Revoke Google tokens if signed in with Google
      try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch (googleError) {
        console.warn('[FirebaseAuthService] Google revocation error:', googleError);
      }

      // Delete Firebase Auth User
      await currentUser.delete();
      return { success: true };
    } catch (error: any) {
      console.error('[FirebaseAuthService] deleteAccount error:', error);
      if (error?.code === 'auth/requires-recent-login') {
        // Attempt re-auth with Google if available
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          await GoogleSignin.signIn();
          const { idToken, accessToken } = await GoogleSignin.getTokens();
          if (idToken) {
            const credential = auth.GoogleAuthProvider.credential(idToken, accessToken);
            const user = auth().currentUser;
            if (user) {
              await user.reauthenticateWithCredential(credential);
              await user.delete();
              return { success: true };
            }
          }
        } catch (reauthErr: any) {
          console.warn('[FirebaseAuthService] reauth on delete failed:', reauthErr);
          return {
            success: false,
            code: 'auth/requires-recent-login',
            error: 'Security checkpoint: Please sign out and sign in again before deleting your account.'
          };
        }
      }
      return {
        success: false,
        error: error?.message || 'Failed to delete account.',
        code: error?.code
      };
    }
  }
}

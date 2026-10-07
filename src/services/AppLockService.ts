import { NativeModules } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

const { PrivacyScreenModule } = NativeModules;

export const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export class AppLockService {
  private static _isAuthenticating: boolean = false;

  static get isAuthenticating(): boolean {
    return this._isAuthenticating;
  }

  static async isAppLockEnabled(): Promise<boolean> {
    try {
      if (PrivacyScreenModule?.isAppLockEnabled) {
        const enabled = await PrivacyScreenModule.isAppLockEnabled();
        return enabled === true;
      }
      return false;
    } catch (e) {
      console.warn('[AppLockService] Error reading isAppLockEnabled:', e);
      return false;
    }
  }

  static async getLockTimeout(): Promise<number> {
    try {
      const setting = await this.getLockTimeoutSetting();
      if (!setting || setting === 'immediate') return 0;
      if (setting === '1m') return 60 * 1000;
      if (setting === '5m') return 5 * 60 * 1000;
      if (setting === '15m') return 15 * 60 * 1000;
      return 0;
    } catch {
      return 0;
    }
  }

  static async getLockTimeoutSetting(): Promise<string> {
    try {
      if (PrivacyScreenModule?.getAppLockTimeout) {
        const timeout = await PrivacyScreenModule.getAppLockTimeout();
        return timeout || 'immediate';
      }
      return 'immediate';
    } catch {
      return 'immediate';
    }
  }

  static async setAppLockEnabled(enabled: boolean): Promise<void> {
    try {
      if (PrivacyScreenModule?.setAppLockEnabled) {
        await PrivacyScreenModule.setAppLockEnabled(enabled);
      }
    } catch (e) {
      console.error('[AppLockService] Error setting appLockEnabled:', e);
    }
  }

  static async setLockTimeout(timeout: string): Promise<void> {
    try {
      if (PrivacyScreenModule?.setAppLockTimeout) {
        await PrivacyScreenModule.setAppLockTimeout(timeout);
      }
    } catch (e) {
      console.error('[AppLockService] Error setting lockTimeout:', e);
    }
  }

  static async authenticate(promptMessage: string = 'Unlock Spend Tracer'): Promise<boolean> {
    this._isAuthenticating = true;
    try {
      const { success } = await rnBiometrics.simplePrompt({ 
        promptMessage,
        cancelButtonText: 'Cancel'
      });
      return success === true;
    } catch (e) {
      console.log('[AppLockService] Authentication failed or cancelled', e);
      return false;
    } finally {
      this._isAuthenticating = false;
    }
  }

  static async resetForDevelopment(): Promise<void> {
    if (__DEV__) {
      try {
        if (PrivacyScreenModule?.resetForDevelopment) {
          await PrivacyScreenModule.resetForDevelopment();
        }
      } catch (e) {
        console.warn('[AppLockService] resetForDevelopment error:', e);
      }
    }
  }
}

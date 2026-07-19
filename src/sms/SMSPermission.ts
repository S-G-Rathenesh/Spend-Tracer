import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { Logger } from '../utils/Logger';

export class SMSPermission {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
      ];

      // Request POST_NOTIFICATIONS for Android 13+
      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      let allGranted = true;
      for (const p of permissionsToRequest) {
        if (granted[p] !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
        }
      }

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'SpendGuard needs SMS and Notification permissions to automatically read and process your banking transactions in the background.',
          [{ text: 'OK' }]
        );
      }

      return allGranted;
    } catch (error) {
      Logger.error('SMSPermission', 'Error requesting permissions', error);
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const readSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const receiveSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      return readSms && receiveSms;
    } catch (e) {
      return false;
    }
  }
}

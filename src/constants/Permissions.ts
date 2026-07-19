import { PermissionsAndroid } from 'react-native';

export const AppPermissions = {
  SMS: PermissionsAndroid.PERMISSIONS.READ_SMS,
  RECEIVE_SMS: PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  STORAGE: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, // For Android < 10 exports
};

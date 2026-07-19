/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';

// Suppress non-critical warnings in debug builds
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted',
  'EventEmitter.removeListener',
  'new NativeEventEmitter',
  'Sending `onAnimatedValueUpdate`',
  'Require cycle:',
]);
import App from './App';
import { name as appName } from './app.json';
import { SMSListener } from './src/sms/SMSListener';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('SmsTask', () => SMSListener);

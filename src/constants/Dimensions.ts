import { Dimensions as RNDimensions, Platform } from 'react-native';

const { width, height } = RNDimensions.get('window');

export const Dimensions = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  iconSize: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
  }
};

// Spend Tracer Premium Design System
// 8-point spacing grid | Semantic colors

import { Dimensions, PixelRatio } from 'react-native';
import { useSettingsStore } from '../hooks/useSettingsStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const [shortDimension] = SCREEN_WIDTH < SCREEN_HEIGHT 
  ? [SCREEN_WIDTH, SCREEN_HEIGHT] 
  : [SCREEN_HEIGHT, SCREEN_WIDTH];

const guidelineBaseWidth = 390;
export const scale = (size: number) => (shortDimension / guidelineBaseWidth) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const rfs = (size: number) => {
  const newSize = moderateScale(size, 0.3);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const darkColors = {
  background: '#000000',
  surface: '#18181B',
  surfaceLight: '#27272A',
  surfaceElevated: '#27272A',
  accent: '#7C3AED',
  primary: '#7C3AED',
  accentLight: '#8B5CF6',
  accentMuted: 'rgba(124, 58, 237, 0.15)',
  accentGlow: 'rgba(124, 58, 237, 0.3)',
  income: '#10B981',
  incomeMuted: 'rgba(16, 185, 129, 0.15)',
  expense: '#EF4444',
  expenseMuted: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  info: '#06B6D4',
  infoMuted: 'rgba(6, 182, 212, 0.15)',
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDisabled: '#52525B',
  border: '#27272A',
  borderLight: '#3F3F46',
  card: '#18181B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export const lightColors = {
  background: '#F4F4F5',
  surface: '#FFFFFF',
  surfaceLight: '#F4F4F5',
  surfaceElevated: '#FFFFFF',
  accent: '#7C3AED',
  primary: '#7C3AED',
  accentLight: '#8B5CF6',
  accentMuted: 'rgba(124, 58, 237, 0.1)',
  accentGlow: 'rgba(124, 58, 237, 0.2)',
  income: '#10B981',
  incomeMuted: 'rgba(16, 185, 129, 0.1)',
  expense: '#EF4444',
  expenseMuted: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.1)',
  info: '#06B6D4',
  infoMuted: 'rgba(6, 182, 212, 0.1)',
  text: '#09090B',
  textPrimary: '#09090B',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  textDisabled: '#A1A1AA',
  border: '#E4E4E7',
  borderLight: '#D4D4D8',
  card: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export type ThemeColors = typeof darkColors;

// Legacy export for files not yet migrated
export const colors = darkColors;

export const spacing = {
  xxs: moderateScale(2),
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
  section: moderateScale(40),
  screen: moderateScale(48),
};

export const borderRadius = {
  xs: moderateScale(6),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  full: 9999,
};

export const getTypography = (c: ThemeColors) => ({
  display: { fontSize: rfs(36), fontWeight: '700' as const, color: c.text, letterSpacing: -0.5 },
  h1: { fontSize: rfs(28), fontWeight: '700' as const, color: c.text, letterSpacing: -0.3 },
  h2: { fontSize: rfs(22), fontWeight: '600' as const, color: c.text },
  h3: { fontSize: rfs(18), fontWeight: '600' as const, color: c.text },
  bodyLg: { fontSize: rfs(16), fontWeight: '400' as const, color: c.text },
  body: { fontSize: rfs(14), fontWeight: '400' as const, color: c.text },
  bodySm: { fontSize: rfs(13), fontWeight: '400' as const, color: c.textSecondary },
  label: { fontSize: rfs(14), fontWeight: '600' as const, color: c.textSecondary },
  labelSm: { fontSize: rfs(12), fontWeight: '500' as const, color: c.textSecondary },
  caption: { fontSize: rfs(11), fontWeight: '400' as const, color: c.textMuted },
  overline: { fontSize: rfs(10), fontWeight: '700' as const, color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const },
});

export const typography = getTypography(darkColors); // Legacy

export const getShadows = (c: ThemeColors) => ({
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  glow: { shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
});

export const shadows = getShadows(darkColors); // Legacy

export const getGradients = (isDark: boolean) => ({
  balanceCard: ['#7C3AED', '#4C1D95'],
  balanceCardSubtle: isDark ? ['#1E1145', '#0D0D0D'] : ['#EDE9FE', '#F9FAFB'],
  accentSubtle: isDark ? ['rgba(124, 58, 237, 0.2)', 'rgba(124, 58, 237, 0.05)'] : ['rgba(124, 58, 237, 0.15)', 'rgba(124, 58, 237, 0.05)'],
});

export const gradients = getGradients(true); // Legacy

export const useAppTheme = () => {
  const { isDarkMode } = useSettingsStore();
  const currentColors = isDarkMode ? darkColors : lightColors;
  return {
    colors: currentColors,
    typography: getTypography(currentColors),
    spacing,
    borderRadius,
    shadows: getShadows(currentColors),
    gradients: getGradients(isDarkMode),
    isDarkMode
  };
};

export type AppTheme = ReturnType<typeof useAppTheme>;


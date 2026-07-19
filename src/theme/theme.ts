// SpendGuard Premium Design System
// 8-point spacing grid | Semantic colors | CRED-inspired dark theme

import { Dimensions, PixelRatio } from 'react-native';

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

export const colors = {
  // Core backgrounds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceLight: '#242424',
  surfaceElevated: '#2A2A2A',

  // Accent (purple — used sparingly)
  accent: '#7C3AED',
  accentLight: '#8B5CF6',
  accentMuted: 'rgba(124, 58, 237, 0.15)',
  accentGlow: 'rgba(124, 58, 237, 0.3)',

  // Semantic
  income: '#4ADE80',
  incomeMuted: 'rgba(74, 222, 128, 0.12)',
  expense: '#F87171',
  expenseMuted: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.12)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDisabled: '#52525B',

  // Borders
  border: '#27272A',
  borderLight: '#3F3F46',

  // Misc
  card: '#1A1A1A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#22C55E',
};

export const gradients = {
  balanceCard: ['#7C3AED', '#4C1D95'],
  balanceCardSubtle: ['#1E1145', '#0D0D0D'],
  accentSubtle: ['rgba(124, 58, 237, 0.2)', 'rgba(124, 58, 237, 0.05)'],
};

export const typography = {
  display: { fontSize: rfs(36), fontWeight: '700' as const, color: colors.text, letterSpacing: -0.5 },
  h1: { fontSize: rfs(28), fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: rfs(22), fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: rfs(18), fontWeight: '600' as const, color: colors.text },
  bodyLg: { fontSize: rfs(16), fontWeight: '400' as const, color: colors.text },
  body: { fontSize: rfs(14), fontWeight: '400' as const, color: colors.text },
  bodySm: { fontSize: rfs(13), fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: rfs(14), fontWeight: '600' as const, color: colors.textSecondary },
  labelSm: { fontSize: rfs(12), fontWeight: '500' as const, color: colors.textSecondary },
  caption: { fontSize: rfs(11), fontWeight: '400' as const, color: colors.textMuted },
  overline: { fontSize: rfs(10), fontWeight: '700' as const, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const },
};

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

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const theme = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
};

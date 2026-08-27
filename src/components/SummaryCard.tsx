import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { CurrencyUtils } from '../utils/CurrencyUtils';
import { useAppTheme, AppTheme, rfs } from '../theme/theme';

interface Props {
  title: string;
  amount: number;
  type?: 'neutral' | 'positive' | 'negative';
  icon?: string;
  iconColor?: string;
  subtitle?: string;
  suffix?: React.ReactNode;
}

export const SummaryCard: React.FC<Props> = ({
  title, amount, type = 'neutral', icon, iconColor, subtitle, suffix
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const amountColor =
    type === 'positive' ? theme.colors.income :
    type === 'negative' ? theme.colors.expense :
    theme.colors.text;

  const iconBg =
    type === 'positive' ? theme.colors.incomeMuted :
    type === 'negative' ? theme.colors.expenseMuted :
    theme.colors.surfaceLight;

  return (
    <View style={styles.cardShadow}>
      <View style={styles.container}>
        {theme.isDarkMode && (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(25, 20, 30, 0.95)"
          />
        )}
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Icon name={icon} size={18} color={iconColor || amountColor} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {CurrencyUtils.format(amount)}
          </Text>
          {suffix && <View style={{ marginLeft: 6 }}>{suffix}</View>}
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  cardShadow: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
    ...(theme.isDarkMode 
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 0 // NO elevation to avoid black artifacts on Android
        } 
      : theme.shadows.sm),
  },
  container: {
    backgroundColor: theme.isDarkMode ? 'rgba(30, 25, 40, 0.85)' : theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    flex: 1,
    borderWidth: theme.isDarkMode ? 1 : 0,
    borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.labelSm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  amount: {
    fontSize: rfs(20),
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
});

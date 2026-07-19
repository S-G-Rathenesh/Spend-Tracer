import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CurrencyUtils } from '../utils/CurrencyUtils';
import { colors, spacing, borderRadius, typography, shadows, rfs } from '../theme/theme';

interface Props {
  title: string;
  amount: number;
  type?: 'neutral' | 'positive' | 'negative';
  icon?: string;
  iconColor?: string;
  subtitle?: string;
}

export const SummaryCard: React.FC<Props> = ({
  title, amount, type = 'neutral', icon, iconColor, subtitle
}) => {
  const amountColor =
    type === 'positive' ? colors.income :
    type === 'negative' ? colors.expense :
    colors.text;

  const iconBg =
    type === 'positive' ? colors.incomeMuted :
    type === 'negative' ? colors.expenseMuted :
    colors.surfaceLight;

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={18} color={iconColor || amountColor} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, { color: amountColor }]}>
        {CurrencyUtils.format(amount)}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    flex: 1,
    ...shadows.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: rfs(20),
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

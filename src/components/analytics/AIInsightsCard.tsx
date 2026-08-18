import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppTheme } from '../../theme/theme';

interface Props {
  theme: AppTheme;
  highestCategory?: { label: string, value: number, color: string };
  topMerchant?: { name: string, amount: number };
  periodLabel: string;
}

export const AIInsightsCard = ({ theme, highestCategory, topMerchant, periodLabel }: Props) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  if (!highestCategory && !topMerchant) return null;

  const isUncategorized = highestCategory && highestCategory.label.trim().toLowerCase() === 'uncategorized';

  let insight = '';
  
  if (isUncategorized) {
    insight = "🏷️ Many transactions are uncategorized. Categorizing them will improve your spending insights.";
  } else if (highestCategory) {
    insight = `✨ AI Insight: Your highest spending category is ${highestCategory.label.trim()}.`;
  } else if (topMerchant) {
    insight = `✨ AI Insight: You spent the most at ${topMerchant.name}.`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.insightText}>{insight}</Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceLight + '30',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
  },
  insightText: {
    ...theme.typography.bodySm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  }
});

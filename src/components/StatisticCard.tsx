import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';

interface Props {
  title?: string;
}

export const StatisticCard: React.FC<Props> = ({ title }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title || 'StatisticCard'}</Text>
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    color: theme.colors.textPrimary,
  }
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';

import { AnimatedEmoji } from './AnimatedEmoji';

interface Props {
  emoji: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

export const EmptyStateCard: React.FC<Props> = ({ emoji, title, subtitle, buttonText, onButtonPress }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <AnimatedEmoji emoji={emoji} type="float" size={48} style={{ marginBottom: 16 }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonText && onButtonPress && (
        <TouchableOpacity style={styles.button} onPress={onButtonPress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.section,
    paddingHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    marginVertical: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  buttonText: {
    ...theme.typography.label,
    color: theme.colors.white,
  },
});

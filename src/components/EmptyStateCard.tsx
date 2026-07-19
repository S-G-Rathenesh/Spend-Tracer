import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

interface Props {
  emoji: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

export const EmptyStateCard: React.FC<Props> = ({ emoji, title, subtitle, buttonText, onButtonPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.section,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginVertical: spacing.sm,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.xxl,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  buttonText: {
    ...typography.label,
    color: colors.white,
  },
});

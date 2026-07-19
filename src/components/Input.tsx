import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface InputProps extends TextInputProps {
  // Custom props can be added here
}

export const Input = (props: InputProps) => {
  return (
    <TextInput
      style={[styles.input, props.style]}
      placeholderTextColor={theme.colors.textSecondary}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
});

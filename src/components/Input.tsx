import React, { useMemo } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';

interface InputProps extends TextInputProps {
  // Custom props can be added here
}

export const Input = (props: InputProps) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TextInput
      style={[styles.input, props.style]}
      placeholderTextColor={theme.colors.textSecondary}
      {...props}
    />
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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

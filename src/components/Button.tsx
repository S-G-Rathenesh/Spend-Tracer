import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export const Button = ({ title, loading, style, ...props }: ButtonProps) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/theme';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    const res = await FirebaseAuthService.login(email, password);
    if (!res.success) {
      setError(res.error || 'Login failed');
    } else {
      navigation.replace('Main');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const res = await FirebaseAuthService.loginWithGoogle();
    if (!res.success) {
      setError(res.error || 'Google Sign-In failed');
    } else {
      navigation.replace('Main');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/spendly_logo.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to Spend Tracer</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
        <Icon name="google" size={20} color={theme.colors.text} style={styles.googleIcon} />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  googleIcon: {
    marginRight: theme.spacing.sm,
  },
  googleButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: theme.colors.accentLight,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
});

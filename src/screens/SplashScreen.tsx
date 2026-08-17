import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../database/DatabaseService';
import { useAuthStore } from '../hooks/useAuthStore';
import { useAppTheme, AppTheme } from '../theme/theme';

type NavigationProp = NativeStackNavigationProp<any, 'Splash'>;

export const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, isLoading } = useAuthStore();
  const fadeAnim = new Animated.Value(0);
  
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [isDbInitialized, setIsDbInitialized] = React.useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    initApp();
  }, []);

  const initApp = async () => {
    try {
      // Add timeout safety so splash screen never hangs
      const initPromise = DatabaseService.initDB();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB Init Timeout')), 5000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
    } catch (e) {
      console.error("DB Initialization failed or timed out:", e);
    } finally {
      setIsDbInitialized(true);
    }
  };

  // Listen to auth state and DB init state
  useEffect(() => {
    if (!isLoading && isDbInitialized) {
      if (user) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    }
  }, [isLoading, user, isDbInitialized]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image 
          source={require('../../assets/spendly_logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Spend Tracer</Text>
        <Text style={styles.subtitle}>Smart Finance Tracking</Text>
      </Animated.View>
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    ...theme.typography.display,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  }
});

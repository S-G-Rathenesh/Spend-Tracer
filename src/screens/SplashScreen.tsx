import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../database/DatabaseService';
import { useAuthStore } from '../hooks/useAuthStore';
import { colors, typography } from '../theme/theme';

type NavigationProp = NativeStackNavigationProp<any, 'Splash'>;

export const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, isLoading } = useAuthStore();
  const fadeAnim = new Animated.Value(0);

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
    }

    if (!isLoading) {
      if (user) {
        navigation.replace('Main');
      } else {
        // Assume Login logic handles this, or directly to Main if bypass is needed
        navigation.replace('Main');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image 
          source={require('../../assets/spendly_logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>SpendGuard</Text>
        <Text style={styles.subtitle}>Smart Finance Tracking</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    ...typography.display,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  }
});

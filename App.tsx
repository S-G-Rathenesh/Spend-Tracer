import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from './src/hooks/useAuthStore';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '74712875997-llgi8ud4a4nu879b6ps670ktpuk7pi24.apps.googleusercontent.com',
});

import { StatusBar } from 'react-native';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppTheme } from './src/theme/theme';

const App = () => {
  const { setUser, setLoading } = useAuthStore();
  const theme = useAppTheme();

  useEffect(() => {
    // Check Firebase authentication state
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const navigationTheme = {
    ...(theme.isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background} 
      />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

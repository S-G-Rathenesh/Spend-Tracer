import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, TouchableOpacity, Animated, NativeModules } from 'react-native';
import { useAuthStore } from '../hooks/useAuthStore';
import { AppLockService } from '../services/AppLockService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../theme/theme';

export type LockState = 'INITIALIZING' | 'UNLOCKED' | 'LOCKED' | 'AUTHENTICATING';

interface AppLockGateProps {
  children: React.ReactNode;
}

export const AppLockGate: React.FC<AppLockGateProps> = ({ children }) => {
  const { user } = useAuthStore();
  const theme = useAppTheme();
  
  const [lockState, setLockState] = useState<LockState>('INITIALIZING');
  const [isBackgroundObscured, setIsBackgroundObscured] = useState<boolean>(false);
  
  const lockStateRef = useRef<LockState>('INITIALIZING');
  lockStateRef.current = lockState;

  const backgroundTimestampRef = useRef<number | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Sync state with lock screen animation
  useEffect(() => {
    if (lockState === 'LOCKED' || lockState === 'AUTHENTICATING') {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [lockState]);

  useEffect(() => {
    // If not logged in, immediately allow navigation
    if (!user) {
      setLockState('UNLOCKED');
      return;
    }

    let isMounted = true;

    const initLockState = async () => {
      try {
        const enabled = await AppLockService.isAppLockEnabled();
        if (!isMounted) return;

        const { PrivacyScreenModule } = NativeModules;
        if (PrivacyScreenModule?.setSecure) {
          PrivacyScreenModule.setSecure(enabled);
        }

        if (enabled) {
          setLockState('LOCKED');
          // Trigger biometric prompt on cold start when enabled
          triggerAuth();
        } else {
          setLockState('UNLOCKED');
        }
      } catch (e) {
        console.warn('[AppLockGate] Error checking lock state, defaulting to UNLOCKED:', e);
        if (isMounted) {
          setLockState('UNLOCKED');
        }
      }
    };

    initLockState();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [user]);

  const triggerAuth = async () => {
    if (lockStateRef.current === 'AUTHENTICATING') return;

    setLockState('AUTHENTICATING');
    try {
      const success = await AppLockService.authenticate();
      if (success) {
        backgroundTimestampRef.current = null;
        setLockState('UNLOCKED');
      } else {
        setLockState('LOCKED');
      }
    } catch {
      setLockState('LOCKED');
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (!user) return;

    // Critical: Do NOT process lifecycle events while BiometricPrompt is active.
    // Android's BiometricPrompt causes the activity to transition to inactive/background
    // and then active when dismissed. Ignoring this avoids relock loops.
    if (AppLockService.isAuthenticating || lockStateRef.current === 'AUTHENTICATING') {
      return;
    }

    const enabled = await AppLockService.isAppLockEnabled();
    if (!enabled) {
      setIsBackgroundObscured(false);
      return;
    }

    if (nextAppState === 'inactive' || nextAppState === 'background') {
      setIsBackgroundObscured(true);
      if (nextAppState === 'background' && !backgroundTimestampRef.current) {
        backgroundTimestampRef.current = Date.now();
      }
    } else if (nextAppState === 'active') {
      setIsBackgroundObscured(false);

      if (lockStateRef.current === 'UNLOCKED' && backgroundTimestampRef.current) {
        const timeoutMs = await AppLockService.getLockTimeout();
        const elapsed = Date.now() - backgroundTimestampRef.current;
        if (elapsed >= timeoutMs) {
          setLockState('LOCKED');
          triggerAuth();
        }
      }
      backgroundTimestampRef.current = null;
    }
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Mount children once past initialization so navigation is available */}
      {lockState !== 'INITIALIZING' && children}

      {/* Recents / Background Obscure Privacy Layer */}
      {isBackgroundObscured && lockState === 'UNLOCKED' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', zIndex: 9998 }]}>
           <Icon name="shield-lock" size={64} color={theme.colors.primary} />
        </View>
      )}

      {/* Neutral Splash/Background during INITIALIZING - prevents both dashboard flash and false lock screen */}
      {lockState === 'INITIALIZING' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, zIndex: 9999 }]} />
      )}

      {/* Lock Screen - ONLY displayed when LOCKED or AUTHENTICATING */}
      {(lockState === 'LOCKED' || lockState === 'AUTHENTICATING') && (
        <Animated.View style={[
          StyleSheet.absoluteFill, 
          styles.lockScreenContainer, 
          { backgroundColor: theme.colors.background, opacity: fadeAnim, zIndex: 9999 }
        ]}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
              <Icon name="lock" size={48} color={theme.colors.accent} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>App Locked</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Use fingerprint or device authentication to continue
            </Text>
            
            <TouchableOpacity 
              style={[styles.unlockButton, { backgroundColor: theme.colors.accent }]}
              onPress={triggerAuth}
              activeOpacity={0.8}
            >
              <Icon name="lock-open-outline" size={20} color={theme.colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.unlockText}>Unlock Spend Tracer</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lockScreenContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing,
  useReducedMotion
} from 'react-native-reanimated';
import { AppTheme } from '../../../theme/theme';

interface Props {
  theme: AppTheme;
  totalMessages: number;
}

export const AiRobot = ({ theme, totalMessages }: Props) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const rotate = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      rotate.value = withRepeat(
        withTiming(360, { duration: 15000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [reducedMotion]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const robotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: scale.value }]
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }]
  }));

  return (
    <View style={styles.container}>
      <View style={styles.robotWrapper}>
        <Animated.View style={[styles.glowRing, glowStyle]} />
        <Animated.View style={[styles.orbitRing, orbitStyle]}>
          <View style={styles.particle1} />
          <View style={styles.particle2} />
          <View style={styles.particle3} />
        </Animated.View>
        <Animated.View style={[styles.robotCore, robotStyle]}>
          <Text style={styles.robotEmoji}>🤖</Text>
        </Animated.View>
      </View>

      <Text style={styles.title}>SMS INTELLIGENCE</Text>
      
      <View style={styles.countContainer}>
        <Text style={styles.countValue}>{totalMessages}</Text>
        <Text style={styles.countLabel}>messages analyzed</Text>
      </View>

      <View style={styles.statusPill}>
        <Text style={styles.statusText}>✨ AI analyzed your SMS</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  robotWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  orbitRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)', // Purple subtle border
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle1: {
    position: 'absolute',
    top: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  particle2: {
    position: 'absolute',
    bottom: 10,
    left: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  particle3: {
    position: 'absolute',
    bottom: 10,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.primary,
  },
  robotCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  robotEmoji: {
    fontSize: 32,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom: theme.spacing.sm,
  },
  countContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  countValue: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  countLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  }
});

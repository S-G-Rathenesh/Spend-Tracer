import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  Easing,
  useReducedMotion
} from 'react-native-reanimated';
import { AppTheme } from '../../../theme/theme';

interface Props {
  theme: AppTheme;
}

export const ClassificationConnector = ({ theme }: Props) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      translateY.value = withRepeat(
        withTiming(40, { duration: 2500, easing: Easing.linear }),
        -1,
        false
      );
      
      opacity.value = withRepeat(
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      opacity.value = 0.5;
    }
  }, [reducedMotion]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value
  }));

  return (
    <View style={styles.container}>
      <View style={styles.line}>
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  line: {
    width: 2,
    height: 40,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: -6,
  }
});

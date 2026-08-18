import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing,
  useReducedMotion
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../../theme/theme';

interface Props {
  theme: AppTheme;
  label: 'Transactions' | 'Non-Transactions' | 'Advertisements' | 'Spam';
  count: number;
  total: number;
  emoji: string;
  color: string;
  delay: number;
  onPress: () => void;
}

export const ClassificationCard = ({ theme, label, count, total, emoji, color, delay, onPress }: Props) => {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const progressWidth = useSharedValue(0);
  const arrowX = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const percentage = total > 0 ? (count / total) * 100 : 0;
  const displayPercent = Number.isInteger(percentage) ? percentage.toString() : percentage.toFixed(1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      progressWidth.value = percentage;
    } else {
      opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
      progressWidth.value = withDelay(delay + 200, withTiming(percentage, { duration: 600, easing: Easing.out(Easing.cubic) }));
    }
  }, [percentage, reducedMotion]);

  const handlePressIn = () => {
    setIsPressed(true);
    if (!reducedMotion) {
      scale.value = withTiming(0.96, { duration: 150 });
      arrowX.value = withTiming(4, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: 150 });
      arrowX.value = withTiming(0, { duration: 150 });
    }
  };

  const styles = useMemo(() => createStyles(theme, color), [theme, color]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowX.value }]
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <Pressable 
        style={styles.pressable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Animated.View style={arrowStyle}>
            <Icon name="arrow-right" size={16} color={color} />
          </Animated.View>
        </View>

        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
        
        <View style={styles.statsRow}>
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.percent}>{displayPercent}%</Text>
        </View>

        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme, accentColor: string) => StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: accentColor + '0A', // very subtle tint (approx 4% opacity)
    borderWidth: 1,
    borderColor: accentColor + '30', // 20% opacity border
    overflow: 'hidden',
  },
  pressable: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  count: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  percent: {
    ...theme.typography.caption,
    color: accentColor,
    fontWeight: '600',
  },
  progressBg: {
    height: 4,
    width: '100%',
    backgroundColor: accentColor + '20',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: accentColor,
    borderRadius: 2,
  }
});

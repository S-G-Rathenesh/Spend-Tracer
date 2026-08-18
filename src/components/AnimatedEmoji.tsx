import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ViewStyle, TextStyle, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat, 
  withSequence,
  withDelay,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';

export type AnimationType = 'fade' | 'bounce' | 'pulse' | 'spin' | 'wiggle' | 'float' | 'breathe' | 'draw' | 'drop';

export interface AnimatedEmojiProps {
  emoji: string;
  type?: AnimationType;
  trigger?: 'onMount' | 'manual';
  duration?: number;
  delay?: number;
  style?: ViewStyle | TextStyle;
  size?: number;
}

export interface AnimatedEmojiRef {
  play: () => void;
  stop: () => void;
}

export const AnimatedEmoji = forwardRef<AnimatedEmojiRef, AnimatedEmojiProps>(({
  emoji,
  type = 'fade',
  trigger = 'onMount',
  duration = 300,
  delay = 0,
  style,
  size = 16
}, ref) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(10);
  const rotation = useSharedValue(0);

  const playAnimation = () => {
    // Reset values
    opacity.value = 0;
    scale.value = type === 'bounce' ? 0.5 : 0.8;
    translateY.value = type === 'drop' ? -20 : (type === 'float' ? 5 : 10);
    rotation.value = 0;

    const withDelayOption = (anim: any) => delay > 0 ? withDelay(delay, anim) : anim;

    switch (type) {
      case 'fade':
        opacity.value = withDelayOption(withTiming(1, { duration }));
        scale.value = withDelayOption(withTiming(1, { duration }));
        translateY.value = withDelayOption(withTiming(0, { duration }));
        break;
      case 'bounce':
        opacity.value = withDelayOption(withTiming(1, { duration: duration / 2 }));
        scale.value = withDelayOption(withSpring(1, { damping: 10, stiffness: 100 }));
        translateY.value = withDelayOption(withSpring(0, { damping: 10, stiffness: 100 }));
        break;
      case 'pulse':
        opacity.value = withTiming(1, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        scale.value = withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(1, { duration: 150 })
        );
        break;
      case 'spin':
        opacity.value = 1;
        scale.value = 1;
        translateY.value = 0;
        rotation.value = withTiming(360, { duration: duration * 2, easing: Easing.linear });
        break;
      case 'wiggle':
        opacity.value = 1;
        scale.value = 1;
        translateY.value = 0;
        rotation.value = withSequence(
          withTiming(-15, { duration: 100 }),
          withTiming(15, { duration: 100 }),
          withTiming(-15, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
        break;
      case 'float':
        opacity.value = withTiming(1, { duration });
        scale.value = withTiming(1, { duration });
        translateY.value = withRepeat(
          withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
        break;
      case 'breathe':
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withRepeat(
          withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
        translateY.value = 0;
        break;
      case 'drop':
        opacity.value = withTiming(1, { duration });
        scale.value = withTiming(1, { duration });
        translateY.value = withSpring(0, { damping: 12, stiffness: 90 });
        break;
      default:
        opacity.value = withTiming(1, { duration });
        scale.value = withTiming(1, { duration });
        translateY.value = withTiming(0, { duration });
    }
  };

  const stopAnimation = () => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(translateY);
    cancelAnimation(rotation);
    opacity.value = 1;
    scale.value = 1;
    translateY.value = 0;
    rotation.value = 0;
  };

  useImperativeHandle(ref, () => ({
    play: playAnimation,
    stop: stopAnimation
  }));

  useEffect(() => {
    if (trigger === 'onMount') {
      playAnimation();
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ]
    };
  });

  return (
    <Animated.Text style={[animatedStyle, { fontSize: size }, style]}>
      {emoji}
    </Animated.Text>
  );
});

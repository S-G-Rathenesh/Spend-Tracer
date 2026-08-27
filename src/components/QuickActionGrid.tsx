import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { useAppTheme, AppTheme, moderateScale } from '../theme/theme';

import { AnimatedEmoji, AnimatedEmojiRef } from './AnimatedEmoji';

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  actions: QuickAction[];
}

const QuickActionItem = ({ action, styles, theme }: { action: QuickAction, styles: any, theme: AppTheme }) => {
  const emojiRef = React.useRef<AnimatedEmojiRef>(null);

  const handlePress = () => {
    emojiRef.current?.play();
    action.onPress();
  };

  const getBurstEmoji = (label: string) => {
    if (label.includes('Expense')) return '💸';
    if (label.includes('Analytics')) return '📊';
    if (label.includes('SMS')) return '📩';
    return '✨';
  };

  return (
    <TouchableOpacity style={styles.item} onPress={handlePress} activeOpacity={0.7}>
      <View style={[
        styles.iconCircle, 
        !theme.isDarkMode && { backgroundColor: `${action.color}18` }
      ]}>
        {theme.isDarkMode && (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={8}
            reducedTransparencyFallbackColor="rgba(30, 25, 40, 0.9)"
          />
        )}
        {theme.isDarkMode && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${action.color}12` }]} />
        )}
        <Icon name={action.icon} size={22} color={action.color} />
        <View style={{ position: 'absolute', top: -15, right: -10 }}>
          <AnimatedEmoji ref={emojiRef} emoji={getBurstEmoji(action.label)} type="bounce" trigger="manual" size={16} duration={400} />
        </View>
      </View>
      <Text style={styles.label} numberOfLines={1}>{action.label}</Text>
    </TouchableOpacity>
  );
};

export const QuickActionGrid: React.FC<Props> = ({ actions }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {actions.map((action, idx) => (
        <QuickActionItem key={idx} action={action} styles={styles} theme={theme} />
      ))}
    </View>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  iconCircle: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: theme.isDarkMode ? 1 : 0,
    borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
    overflow: 'hidden',
  },
  label: {
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

const QuickActionItem = ({ action, styles }: { action: QuickAction, styles: any }) => {
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
      <View style={[styles.iconCircle, { backgroundColor: `${action.color}18` }]}>
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
        <QuickActionItem key={idx} action={action} styles={styles} />
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
  },
  label: {
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

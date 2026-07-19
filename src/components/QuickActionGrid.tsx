import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography, moderateScale } from '../theme/theme';

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  actions: QuickAction[];
}

export const QuickActionGrid: React.FC<Props> = ({ actions }) => {
  return (
    <View style={styles.container}>
      {actions.map((action, idx) => (
        <TouchableOpacity key={idx} style={styles.item} onPress={action.onPress} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: `${action.color}18` }]}>
            <Icon name={action.icon} size={22} color={action.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconCircle: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelSm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

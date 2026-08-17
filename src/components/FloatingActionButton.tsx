import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme } from '../theme/theme';

interface Props {
  onPress: () => void;
  icon?: string;
}

export const FloatingActionButton: React.FC<Props> = ({ onPress, icon = 'plus' }) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  return (
    <TouchableOpacity 
      style={[
        styles.fab, 
        { 
          bottom: 24 + insets.bottom, 
          right: Math.max(24, insets.right + 16) 
        }
      ]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      <Icon name={icon} size={32} color={theme.colors.white} />
    </TouchableOpacity>
  );
};

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    shadowColor: theme.colors.accent,
  }
});

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../theme/theme';

interface Props {
  visible: boolean;
  selectedYear: number;
  years: number[];
  theme: AppTheme;
  onSelectYear: (year: number) => void;
  onClose: () => void;
}

export const YearPickerModal = ({
  visible,
  selectedYear,
  years,
  theme,
  onSelectYear,
  onClose,
}: Props) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Year</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.list}>
            {years.map((year) => {
              const isSelected = selectedYear === year;
              return (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearItem, isSelected && styles.yearItemActive]}
                  onPress={() => {
                    onSelectYear(year);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearText, isSelected && styles.yearTextActive]}>
                    {year}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '85%',
      maxWidth: 320,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.textPrimary,
    },
    list: {
      gap: 8,
    },
    yearItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
    },
    yearItemActive: {
      backgroundColor: theme.colors.primary + '20',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    yearText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    yearTextActive: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
  });

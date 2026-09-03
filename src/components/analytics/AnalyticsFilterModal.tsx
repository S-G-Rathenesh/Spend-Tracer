import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../theme/theme';
import { DefaultCategories } from '../../constants/Categories';

interface Props {
  visible: boolean;
  theme: AppTheme;
  currentTypeFilter: 'ALL' | 'Debit' | 'Credit';
  currentCategoryFilter: string | null;
  onApply: (type: 'ALL' | 'Debit' | 'Credit', categoryId: string | null) => void;
  onReset: () => void;
  onClose: () => void;
}

export const AnalyticsFilterModal = ({
  visible,
  theme,
  currentTypeFilter,
  currentCategoryFilter,
  onApply,
  onReset,
  onClose,
}: Props) => {
  const [selectedType, setSelectedType] = useState<'ALL' | 'Debit' | 'Credit'>(currentTypeFilter);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(currentCategoryFilter);

  // Sync state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setSelectedType(currentTypeFilter);
      setSelectedCategory(currentCategoryFilter);
    }
  }, [visible, currentTypeFilter, currentCategoryFilter]);

  const handleApply = () => {
    onApply(selectedType, selectedCategory);
    onClose();
  };

  const handleReset = () => {
    setSelectedType('ALL');
    setSelectedCategory(null);
    onReset();
    onClose();
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="tune-variant" size={22} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>Filter Analytics</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Transaction Type Filter */}
            <Text style={styles.sectionLabel}>TRANSACTION TYPE</Text>
            <View style={styles.typeRow}>
              {[
                { label: 'All', value: 'ALL' as const },
                { label: 'Expenses Only', value: 'Debit' as const },
                { label: 'Income Only', value: 'Credit' as const },
              ].map((item) => {
                const isActive = selectedType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                    onPress={() => setSelectedType(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category Filter */}
            <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              <TouchableOpacity
                style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {DefaultCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, isActive && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '75%',
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      ...theme.typography.h3,
      color: theme.colors.textPrimary,
    },
    body: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: theme.spacing.sm,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    typeBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    typeBtnText: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    typeBtnTextActive: {
      color: '#000000',
      fontWeight: '700',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 20,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    catChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '20',
    },
    catDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    catChipText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    catChipTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    resetBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    resetBtnText: {
      ...theme.typography.button,
      color: theme.colors.textSecondary,
    },
    applyBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    applyBtnText: {
      ...theme.typography.button,
      color: '#000000',
      fontWeight: 'bold',
    },
  });

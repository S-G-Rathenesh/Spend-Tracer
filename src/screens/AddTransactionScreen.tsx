import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { Category } from '../types/Category';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';

type RootStackParamList = {
  Transactions: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Transactions'>;

export const AddTransactionScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > 600;
  const { addTransaction, updateTransaction, transactions, deleteTransaction } = useTransactionStore();
  
  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'Debit'|'Credit'>('Debit');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      const tx = transactions.find(t => t.id === transactionId);
      if (tx) {
        setAmount(tx.amount.toString());
        setMerchant(tx.merchantId || tx.bank || '');
        setNotes(tx.notes || '');
        setType(tx.type);
        setSelectedCategory(tx.categoryId || '');
      }
    }
  }, []);

  const loadCategories = async () => {
    const cats = await CategoryRepository.getAll();
    setCategories(cats);
    if (!isEditing && cats.length > 0) {
      setSelectedCategory(cats[0].id);
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const now = new Date();
    const txData = {
      id: isEditing ? transactionId : Math.random().toString(36).substr(2, 9),
      amount: Number(amount),
      merchantId: merchant, 
      bank: null,
      categoryId: selectedCategory,
      type,
      date: now.toISOString().split('T')[0],
      time: now.toISOString().split('T')[1].substring(0, 8),
      notes,
      source: 'manual' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (isEditing) {
      await updateTransaction(txData as any);
    } else {
      await addTransaction(txData as any);
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTransaction(transactionId);
        navigation.goBack();
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Transaction' : 'New Transaction'}</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
            <Icon name="delete" size={24} color={colors.expense} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'Debit' && styles.typeButtonActiveDebit]}
            onPress={() => setType('Debit')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeText, type === 'Debit' && styles.typeTextActive]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'Credit' && styles.typeButtonActiveCredit]}
            onPress={() => setType('Credit')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeText, type === 'Credit' && styles.typeTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.currencyPrefix, { color: type === 'Debit' ? colors.expense : colors.income }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: type === 'Debit' ? colors.expense : colors.income }]}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={amount}
            onChangeText={setAmount}
            autoFocus={!isEditing}
          />
        </View>

        <Text style={styles.label}>Merchant / Title</Text>
        <View style={styles.inputWrapper}>
          <Icon name="storefront-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Starbucks, Amazon"
            placeholderTextColor={colors.textMuted}
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryChip, 
                  isSelected && { backgroundColor: `${cat.color}20`, borderColor: cat.color }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Icon name={cat.icon} size={18} color={isSelected ? cat.color : colors.textSecondary} />
                <Text style={[styles.categoryText, isSelected && { color: cat.color, fontWeight: '600' }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Notes (Optional)</Text>
        <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
          <Icon name="text" size={20} color={colors.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Add details..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Transaction</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  form: {
    paddingHorizontal: spacing.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    marginVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeButtonActiveDebit: {
    backgroundColor: colors.expenseMuted,
  },
  typeButtonActiveCredit: {
    backgroundColor: colors.incomeMuted,
  },
  typeText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },
  currencyPrefix: {
    fontSize: 40,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 100,
  },
  label: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.bodyLg,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxxl,
    ...shadows.glow,
  },
  saveButtonText: {
    ...typography.label,
    color: colors.white,
    fontSize: 16,
  }
});

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../hooks/useTransactionStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { Category } from '../types/Category';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, AppTheme } from '../theme/theme';

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
  
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
    
    let txData: any = {
      id: Math.random().toString(36).substr(2, 9),
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
      const existingTx = transactions.find(t => t.id === transactionId);
      if (existingTx) {
        txData = {
          ...existingTx,
          amount: Number(amount),
          merchantId: merchant,
          categoryId: selectedCategory,
          userCategory: selectedCategory,
          finalCategory: selectedCategory,
          aiConfidence: 1.0,
          needsVerification: false,
          type,
          notes,
          updatedAt: now.toISOString(),
        };

        const learned = await MerchantCategoryRepository.learnCorrection(
          merchant,
          selectedCategory,
          existingTx.originalSms,
          existingTx.smsHash,
          existingTx.bank,
          existingTx.bank
        );

        await TransactionRepository.autoCategorizeMatchingTransactions({
          category: selectedCategory,
          matchType: learned.matchType,
          upiId: learned.upiId,
          normalizedName: learned.normalizedName,
          merchantName: learned.merchantName,
          smsHash: learned.smsHash,
          excludeId: existingTx.id
        });

      }
      await updateTransaction(txData);
    } else {
      await addTransaction(txData);
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
          <Icon name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Transaction' : 'New Transaction'}</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
            <Icon name="delete" size={24} color={theme.colors.expense} />
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
          <Text style={[styles.currencyPrefix, { color: type === 'Debit' ? theme.colors.expense : theme.colors.income }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: type === 'Debit' ? theme.colors.expense : theme.colors.income }]}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textMuted}
            value={amount}
            onChangeText={setAmount}
            autoFocus={!isEditing}
          />
        </View>

        <Text style={styles.label}>Merchant / Title</Text>
        <View style={styles.inputWrapper}>
          <Icon name="storefront-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Starbucks, Amazon"
            placeholderTextColor={theme.colors.textMuted}
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
                <Icon name={cat.icon} size={18} color={isSelected ? cat.color : theme.colors.textSecondary} />
                <Text style={[styles.categoryText, isSelected && { color: cat.color, fontWeight: '600' }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Notes (Optional)</Text>
        <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
          <Icon name="text" size={20} color={theme.colors.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Add details..."
            placeholderTextColor={theme.colors.textMuted}
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
  },
  form: {
    paddingHorizontal: theme.spacing.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    marginVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  typeButtonActiveDebit: {
    backgroundColor: theme.colors.expenseMuted,
  },
  typeButtonActiveCredit: {
    backgroundColor: theme.colors.incomeMuted,
  },
  typeText: {
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
  },
  typeTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xxl,
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
    ...theme.typography.labelSm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    paddingLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...theme.typography.bodyLg,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xxxl,
    ...theme.shadows.glow,
  },
  saveButtonText: {
    ...theme.typography.label,
    color: theme.colors.white,
    fontSize: 16,
  }
});

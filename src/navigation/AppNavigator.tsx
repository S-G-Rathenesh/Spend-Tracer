import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../theme/theme';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { TransactionDetailsScreen } from '../screens/TransactionDetailsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { PendingVerificationScreen } from '../screens/PendingVerificationScreen';
import { SmsDebugScreen } from '../screens/SmsDebugScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useAppTheme();
  
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        height: 60 + Math.max(insets.bottom, 10),
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 12,
        ...shadows.lg,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
      },
      tabBarIcon: ({ color, focused }) => {
        let iconName = 'home-outline';
        if (route.name === 'Dashboard') iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
        else if (route.name === 'Transactions') iconName = focused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Analytics') iconName = focused ? 'chart-donut' : 'chart-arc';
        else if (route.name === 'Settings') iconName = focused ? 'cog' : 'cog-outline';
        
        return (
          <View style={{ alignItems: 'center' }}>
            <Icon name={iconName} size={24} color={color} />
            {focused && (
              <View 
                style={{ 
                  position: 'absolute', 
                  bottom: -22, 
                  width: 4, 
                  height: 4, 
                  borderRadius: 2, 
                  backgroundColor: colors.accent 
                }} 
              />
            )}
          </View>
        );
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Transactions" component={TransactionsScreen} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen 
        name="TransactionDetails" 
        component={TransactionDetailsScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen 
        name="SmsDebug" 
        component={SmsDebugScreen} 
      />
      <Stack.Screen 
        name="PendingVerification" 
        component={PendingVerificationScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

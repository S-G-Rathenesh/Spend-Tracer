import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const EmptyState = () => {
  return (
    <View style={styles.container}>
      <Text>EmptyState</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

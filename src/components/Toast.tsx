import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Toast = () => {
  return (
    <View style={styles.container}>
      <Text>Toast</Text>
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

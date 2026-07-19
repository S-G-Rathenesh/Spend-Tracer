import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LoadingIndicator = () => {
  return (
    <View style={styles.container}>
      <Text>LoadingIndicator</Text>
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

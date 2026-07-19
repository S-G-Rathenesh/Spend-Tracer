import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Snackbar = () => {
  return (
    <View style={styles.container}>
      <Text>Snackbar</Text>
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

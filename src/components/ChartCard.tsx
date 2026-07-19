import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title?: string;
}

export const ChartCard: React.FC<Props> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title || 'ChartCard'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginVertical: 8,
  },
  text: {
    color: '#FFF',
  }
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Простая заглушка для AppNavigator
const AppNavigator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Приложение успешно запущено!</Text>
      <Text style={styles.subText}>Это заглушка для демонстрации работы</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#2196F3',
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#757575',
  },
});

export default AppNavigator;

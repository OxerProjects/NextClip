import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export function Footer() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>© כל הזכויות שמורות ל-NextClip</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.background,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.4)', // "לא מורגש באפור"
    fontSize: 14,
  }
});

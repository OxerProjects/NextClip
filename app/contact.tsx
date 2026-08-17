import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Seo } from '@/components/Seo';

export default function ContactScreen() {
  return (
    <>
      {/* noindex: placeholder page with no real content yet — the live contact
          form lives in ContactSection on the home page. */}
      <Seo path="/contact" title="צור קשר" description="דברו איתנו — NextClip." noindex />
      <View style={styles.container}>
        <Text style={styles.title}>צור קשר</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
});

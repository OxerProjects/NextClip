import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { I18nManager, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useEffect } from 'react';

// Hide scrollbar on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; font-family: 'Google Sans', sans-serif; }
    html { scroll-behavior: smooth; }
  `;
  document.head.appendChild(style);
}

// Force RTL
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch (e) {
  console.log('RTL Error', e);
}

export const unstable_settings = {
  // Ensure that reloading on `/` keeps a back button present.
  initialRouteName: 'index',
};

const CustomTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.background,
    notification: Colors.dark.tint,
  },
};

import { Header } from '@/components/Header';

export default function RootLayout() {
  return (
    <ThemeProvider value={CustomTheme}>
      <Header />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="specialties" />
        <Stack.Screen name="gallery" />
        <Stack.Screen name="about" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="login" />
        <Stack.Screen name="client-event" />
        <Stack.Screen name="dashboard" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

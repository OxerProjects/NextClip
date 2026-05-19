import { Colors } from '@/constants/theme';
import { getClientEvents } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

export default function LoginScreen() {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleLogin = async () => {
    if (!code.trim()) {
      setErrorMsg('אנא הזן קוד גישה');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanCode = code.trim();

      // Admin route override
      if (cleanCode.toLowerCase() === 'admin') {
        router.push('/dashboard');
        setLoading(false);
        return;
      }

      // Check client events
      const events = await getClientEvents();
      const foundEvent = events.find(e => e.code === cleanCode);

      if (foundEvent) {
        // Redirect to private client event view
        router.push(`/client-event?id=${foundEvent.id}`);
      } else {
        setErrorMsg('קוד גישה שגוי או פג תוקף, אנא נסה שוב');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('אירעה שגיאה בחיבור, אנא נסה שוב מאוחר יותר');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Ambient Glowing Blobs */}
      <View style={styles.blueBlob} pointerEvents="none" />
      <View style={styles.purpleBlob} pointerEvents="none" />

      <View style={StyleSheet.flatten([styles.card, isMobile && styles.mobileCard])}>
        {/* Logo */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>אזור אישי ללקוחות</Text>
        <Text style={styles.subtitle}>הזינו את קוד הגישה שקיבלתם על מנת לצפות ולהוריד את חומרי הצילום מהאירוע שלכם</Text>

        {/* Input Block */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="הזן קוד גישה (לדוגמה: 1234)"
            placeholderTextColor="#64748b"
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setErrorMsg('');
            }}
            onSubmitEditing={handleLogin}
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Error Alert */}
        {!!errorMsg && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => StyleSheet.flatten([
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            loading && styles.submitButtonLoading
          ])}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? 'מתחבר...' : 'כניסה לגלריה האישית'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    position: 'relative',
  },
  blueBlob: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#0056DB',
    opacity: 0.15,
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
      },
    }),
  },
  purpleBlob: {
    position: 'absolute',
    bottom: '15%',
    right: '10%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8b5cf6',
    opacity: 0.1,
    ...Platform.select({
      web: {
        filter: 'blur(90px)',
      },
    }),
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  mobileCard: {
    padding: 24,
  },
  logo: {
    width: 180,
    height: 70,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Google Sans, sans-serif',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Google Sans, sans-serif',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Google Sans, sans-serif',
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#0056DB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0056DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 24,
  },
  submitButtonPressed: {
    backgroundColor: '#0043b0',
  },
  submitButtonLoading: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
  bold: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
});

import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View, ActivityIndicator, Alert, Platform } from 'react-native';
import { saveLead } from '@/utils/storage';

export function ContactSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't open URL", err));
  };

  const handleSubmit = async () => {
    if (!name || !phone) {
      if (Platform.OS === 'web') {
        window.alert('אנא מלא שם וטלפון');
      } else {
        Alert.alert('שגיאה', 'אנא מלא שם וטלפון');
      }
      return;
    }
    
    setIsSubmitting(true);
    await saveLead({
      name, phone, email, message
    });
    setIsSubmitting(false);
    setSuccess(true);
    setName('');
    setPhone('');
    setEmail('');
    setMessage('');
    
    setTimeout(() => {
      setSuccess(false);
    }, 4000);
  };

  const renderForm = () => (
    <View style={styles.formColumn}>
      <Text style={styles.formTitle}>פנה אלינו</Text>
      <Text style={styles.formSubtitle}>התקשרו! שיחת ייעוץ ללא תשלום</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>שם מלא:</Text>
        <TextInput
          style={styles.input}
          placeholder="שם מלא"
          placeholderTextColor="#999"
          textAlign="right"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>טלפון:</Text>
        <TextInput
          style={styles.input}
          placeholder="טלפון"
          placeholderTextColor="#999"
          textAlign="right"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>אימייל:</Text>
        <TextInput
          style={styles.input}
          placeholder="אימייל"
          placeholderTextColor="#999"
          textAlign="right"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>תיאור הפניה:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="...תוכן הפנייה"
          placeholderTextColor="#999"
          textAlign="right"
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, success && { backgroundColor: '#10b981' }]} 
        onPress={handleSubmit}
        disabled={isSubmitting || success}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{success ? 'נשלח בהצלחה!' : 'שליחה'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>צור קשר</Text>

      <View style={[styles.content, isMobile && styles.mobileContent]}>

        {isMobile ? (
          // Mobile Layout: Form occupies full width, and contact buttons are grouped as clean circular icons below
          <View style={styles.mobileWrapper}>
            {renderForm()}

            {/* Mobile Contact Icons Row - Icons grouped together beautifully */}
            <View style={styles.mobileIconsRow}>
              <IconButton icon="whatsapp" color="#4ade80" onPress={() => handleOpenLink("https://wa.me/972508474111")} />
              <IconButton icon="phone-alt" color="#5eead4" onPress={() => handleOpenLink("tel:0508474111")} />
              <IconButton icon="envelope" color="#ff8a65" onPress={() => handleOpenLink("mailto:Next.Clip.St@gmail.com")} />
              <IconButton icon="instagram" color="#ec4899" onPress={() => handleOpenLink("https://www.instagram.com/next_clip_studio/")} />
              <IconButton icon="tiktok" color="#818cf8" onPress={() => handleOpenLink("https://www.tiktok.com/@next_clip_studio?_r=1&_t=ZS-912ypQaG6qW")} />
            </View>
          </View>
        ) : (
          // Desktop Layout
          <>
            {/* Left Side: Contact Info Cards */}
            <View style={styles.infoColumn}>
              <ContactCard icon="whatsapp" color="#4ade80" text="NextClip" onPress={() => handleOpenLink("https://wa.me/972508474111")} />
              <ContactCard icon="phone-alt" color="#5eead4" text="050-84741111" onPress={() => handleOpenLink("tel:0508474111")} />
              <ContactCard icon="envelope" color="#ff8a65" text="Next.Clip.St@gmail.com" onPress={() => handleOpenLink("mailto:Next.Clip.St@gmail.com")} />
              <ContactCard icon="instagram" color="#ec4899" text="@next_clip_studio" onPress={() => handleOpenLink("https://www.instagram.com/next_clip_studio/")} />
              <ContactCard icon="tiktok" color="#818cf8" text="@next_clip_studio" onPress={() => handleOpenLink("https://www.tiktok.com/@next_clip_studio?_r=1&_t=ZS-912ypQaG6qW")} />
            </View>

            {/* Right Side: Form */}
            {renderForm()}
          </>
        )}

      </View>
    </View>
  );
}

function ContactCard({ icon, color, text, onPress }: { icon: string, color: string, text: string, onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardText}>{text}</Text>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <FontAwesome5 name={icon} size={20} color="#000" />
      </View>
    </TouchableOpacity>
  );
}

function IconButton({ icon, color, onPress }: { icon: string, color: string, onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.iconCircle, { backgroundColor: color }]} onPress={onPress}>
      <FontAwesome5 name={icon} size={22} color="#000" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    width: '100%',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'right',
    width: '100%',
    maxWidth: 1000,
  },
  mobileMainTitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    flexDirection: 'row-reverse',
    width: '100%',
    maxWidth: 1000,
    gap: 40,
    justifyContent: 'space-between',
  },
  mobileContent: {
    flexDirection: 'column',
    gap: 24,
  },
  mobileWrapper: {
    width: '100%',
    gap: 30,
  },
  infoColumn: {
    flex: 1,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827', // Very dark blue/gray
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formColumn: {
    flex: 1.2,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 30,
    width: '100%',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#38bdf8', // Light blue highlight
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 30,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
    direction: 'rtl',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    direction: 'rtl',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'right',
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Mobile circular icons row
  mobileIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    width: '100%',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});

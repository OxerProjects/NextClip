import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export function ServicesSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>השירותים שלנו</Text>
      
      <View style={[styles.grid, isMobile && styles.mobileGrid]}>
        
        {/* RIGHT CARD: מגנטים */}
        <View style={[styles.card, isMobile && styles.mobileCard]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=600' }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>מגנטים</Text>
            <Text style={styles.cardText}>
              לכל תמונה יפה מגיעה איכות מקסימלית! כל מגנט מעוצב באופן אישי לבחירתכם ולפי סגנון האירוע. על החומרים שלנו אנחנו לא מתפשרים על מנת לקבל תוצאה של מזכרת מעוצבת, יוקרתית ועמידה – בדיוק כמו הרגעים שהיא מתעדת.
            </Text>
          </View>
        </View>

        {/* CENTER CARD (Prominent & Larger): עמדת צילום AI */}
        <View style={[styles.card, styles.prominentCard, isMobile && styles.mobileCard]}>
          {Platform.OS === 'web' && (
            <View style={styles.glowOverlay} pointerEvents="none" />
          )}
          
          <View style={styles.imageWrapper}>
            <Image
              source={require('@/assets/images/emda1.png')}
              style={styles.prominentImage}
              resizeMode="cover"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>הבחירה הפופולרית</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, styles.prominentTitle]}>עמדת צילום AI</Text>
            <Text style={styles.cardText}>
              אצלנו לא מדובר בעוד עמדת צילום משעממת, העמדה שלנו היא אטרקציה שלא רואים באף אירוע אחר!{'\n\n'}
              בחירת מגוון עצום של אפקטים מיוחדים של AI, ותוספות מיוחדות (כמו: שטיח אדום, עמודי חבלול, חצובות תאורה, מראה מעוצבת עם שמות המתחתנים), הופכים את העמדה שלנו לאטרקציה יפה, מחמיאה, ומזמינה שהאורחים לא שוכחים.
            </Text>
          </View>
        </View>

        {/* LEFT CARD: צילום סטילס */}
        <View style={[styles.card, isMobile && styles.mobileCard]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600' }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>צילום סטילס</Text>
            <Text style={styles.cardText}>
              צלמים מקצועיים שיתפסו את כל הרגעים החשובים באירוע שלכם, החיוכים, ההתרגשות, הקסם של האירוע שלכם והכל, בצורה הכי מחמיאה ויפה שיש.
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 100,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    position: 'relative',
    zIndex: 11,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 80,
    fontFamily: 'Google Sans, sans-serif',
    textShadowColor: 'rgba(0, 86, 219, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  mobileMainTitle: {
    fontSize: 38,
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row-reverse', // RTL Layout: Magnets (right), Booth (center), Stills (left)
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 32,
    maxWidth: 1400,
    width: '100%',
  },
  mobileGrid: {
    flexDirection: 'column', // Stack vertically on mobile
    gap: 40,
    paddingHorizontal: 10,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        transition: 'transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        cursor: 'default',
        ':hover': {
          transform: 'translateY(-8px)',
          borderColor: 'rgba(0, 86, 219, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }
      }
    }),
  },
  prominentCard: {
    flex: 1.15, // Make the middle card slightly wider on desktop
    borderColor: 'rgba(0, 86, 219, 0.3)',
    backgroundColor: 'rgba(0, 86, 219, 0.03)',
    transform: Platform.OS === 'web' ? [{ scale: 1.04 }] : [], // Boost the scale on desktop
    ...Platform.select({
      web: {
        boxShadow: '0 20px 50px rgba(0, 86, 219, 0.15)',
        ':hover': {
          transform: 'translateY(-12px) scale(1.06)',
          borderColor: '#0056DB',
          boxShadow: '0 25px 60px rgba(0, 86, 219, 0.3)',
        }
      }
    }),
  },
  mobileCard: {
    flex: 0,
    width: '100%',
    transform: [],
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    // @ts-ignore
    backgroundImage: 'radial-gradient(circle at top, rgba(0, 86, 219, 0.15) 0%, transparent 60%)',
    zIndex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 240,
  },
  prominentImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#0056DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    shadowColor: '#0056DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
    direction: 'rtl',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
  prominentTitle: {
    fontSize: 34,
    color: '#3b82f6', // Glowing blue for the title
    textShadowColor: 'rgba(59, 130, 246, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
});

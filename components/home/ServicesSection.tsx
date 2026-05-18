import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, Platform, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { Link } from 'expo-router';

const SERVICES_DATA = [
  {
    id: 1,
    title: 'מגנטים',
    text: 'לכל תמונה יפה מגיעה איכות מקסימלית! כל מגנט מעוצב באופן אישי לבחירתכם ולפי סגנון האירוע. על החומרים שלנו אנחנו לא מתפשרים על מנת לקבל תוצאה של מזכרת מעוצבת, יוקרתית ועמידה – בדיוק כמו הרגעים שהיא מתעדת.',
    image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=600',
    isProminent: false,
  },
  {
    id: 2,
    title: 'עמדת צילום AI',
    text: 'אצלנו לא מדובר בעוד עמדת צילום משעממת, העמדה שלנו היא אטרקציה שלא רואים באף אירוע אחר!\n\nבחירת מגוון עצום של אפקטים מיוחדים של AI, ותוספות מיוחדות (כמו: שטיח אדום, עמודי חבלול, חצובות תאורה, מראה מעוצבת עם שמות המתחתנים), הופכים את העמדה שלנו לאטרקציה יפה, מחמיאה, ומזמינה שהאורחים לא שוכחים.',
    image: require('@/assets/images/emda1.png'),
    isProminent: true,
    badgeText: 'הבחירה הפופולרית',
  },
  {
    id: 3,
    title: 'צילום סטילס',
    text: 'צלמים מקצועיים שיתפסו את כל הרגעים החשובים באירוע שלכם, החיוכים, ההתרגשות, הקסם של האירוע שלכם והכל, בצורה הכי מחמיאה ויפה שיש.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600',
    isProminent: false,
  }
];

export function ServicesSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Track hovered state for cards and buttons
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>השירותים שלנו</Text>
      
      <View style={[styles.grid, isMobile && styles.mobileGrid]}>
        {SERVICES_DATA.map((item, index) => {
          const isHovered = hoveredCard === index;
          const isBtnHovered = hoveredBtn === index;
          const imageSrc = typeof item.image === 'number' ? item.image : { uri: item.image };

          // Build dynamic inline Web-only styles to prevent StyleSheet.create style-parser compile crashes on Web
          const webCardStyles = Platform.OS === 'web' ? {
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease',
            cursor: 'pointer',
            boxShadow: isHovered
              ? (item.isProminent ? '0 30px 60px rgba(0, 86, 219, 0.3)' : '0 25px 50px rgba(0, 0, 0, 0.5)')
              : (item.isProminent ? '0 20px 50px rgba(0, 86, 219, 0.12)' : '0 8px 16px rgba(0, 0, 0, 0.3)'),
          } : {};

          const webBtnStyles = Platform.OS === 'web' ? {
            transition: 'transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            boxShadow: item.isProminent && isBtnHovered ? '0 8px 20px rgba(0, 86, 219, 0.4)' : 'none',
          } : {};

          return (
            <Pressable
              key={item.id}
              onHoverIn={() => !isMobile && setHoveredCard(index)}
              onHoverOut={() => !isMobile && setHoveredCard(null)}
              style={[
                styles.card,
                item.isProminent && styles.prominentCard,
                isMobile && styles.mobileCard,
                isHovered && styles.cardHovered,
                item.isProminent && isHovered && styles.prominentCardHovered,
                webCardStyles as any,
              ]}
            >
              {item.isProminent && Platform.OS === 'web' && (
                <View 
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      borderRadius: 24,
                      backgroundImage: 'radial-gradient(circle at top, rgba(0, 86, 219, 0.15) 0%, transparent 60%)',
                      zIndex: 1,
                    } as any
                  ]}
                  pointerEvents="none"
                />
              )}
              
              <View style={[styles.imageWrapper, item.isProminent && styles.prominentImageWrapper]}>
                <Image
                  source={imageSrc}
                  style={item.isProminent ? styles.prominentImage : styles.cardImage}
                  resizeMode="cover"
                />
                {item.isProminent && item.badgeText && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badgeText}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, item.isProminent && styles.prominentTitle]}>
                  {item.title}
                </Text>
                <Text style={styles.cardText}>
                  {item.text}
                </Text>

                {/* Button: לפרטים נוספים ומחיר */}
                <Link href="/booking" asChild>
                  <Pressable
                    onHoverIn={() => !isMobile && setHoveredBtn(index)}
                    onHoverOut={() => !isMobile && setHoveredBtn(null)}
                    style={[
                      styles.ctaButton,
                      item.isProminent ? styles.prominentCtaButton : styles.outlineCtaButton,
                      isBtnHovered && styles.ctaButtonHovered,
                      item.isProminent && isBtnHovered && styles.prominentCtaButtonHovered,
                      !item.isProminent && isBtnHovered && styles.outlineCtaButtonHovered,
                      webBtnStyles as any,
                    ]}
                  >
                    <Text style={[
                      styles.ctaButtonText,
                      !item.isProminent && styles.outlineCtaText,
                      !item.isProminent && isBtnHovered && styles.outlineCtaTextHovered
                    ]}>
                      לפרטים נוספים ומחיר
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Pressable>
          );
        })}
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
    flexDirection: 'column',
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
    position: 'relative',
  },
  prominentCard: {
    flex: 1.15,
    borderColor: 'rgba(0, 86, 219, 0.25)',
    backgroundColor: 'rgba(0, 86, 219, 0.03)',
    transform: Platform.OS === 'web' ? [{ scale: 1.03 }] : [],
  },
  mobileCard: {
    flex: 0,
    width: '100%',
    transform: [],
  },
  // Hover styles utilizing active state transitions for buttery smooth response
  cardHovered: {
    transform: [{ translateY: -12 }],
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  prominentCardHovered: {
    transform: [{ translateY: -16 }, { scale: 1.05 }],
    borderColor: '#0056DB',
    backgroundColor: 'rgba(0, 86, 219, 0.05)',
  },
  imageWrapper: {
    width: '100%',
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  prominentImageWrapper: {
    height: 280,
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
    width: '100%',
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
    color: '#3b82f6',
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
    marginBottom: 32,
    minHeight: 130, // Keep height unified so CTA buttons align perfectly
  },
  // Button Styles
  ctaButton: {
    width: '100%',
    maxWidth: 240,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prominentCtaButton: {
    backgroundColor: '#0056DB',
    shadowColor: '#0056DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineCtaButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 86, 219, 0.5)',
  },
  outlineCtaButtonHovered: {
    backgroundColor: '#0056DB',
    borderColor: '#0056DB',
  },
  ctaButtonHovered: {
    transform: [{ scale: 1.05 }],
  },
  prominentCtaButtonHovered: {
    backgroundColor: '#0043b0',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  prominentCtaButtonText: {
    color: '#fff',
  },
  outlineCtaText: {
    color: '#3b82f6',
  },
  outlineCtaTextHovered: {
    color: '#fff',
  },
});

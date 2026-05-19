import { Colors } from '@/constants/theme';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const SERVICES_DATA = [
  {
    id: 1,
    title: 'מגנטים',
    text: 'לכל תמונה יפה מגיעה איכות מקסימלית! כל מגנט מעוצב באופן אישי לבחירתכם ולפי סגנון האירוע. על החומרים שלנו אנחנו לא מתפשרים על מנת לקבל תוצאה של מזכרת מעוצבת, יוקרתית ועמידה – בדיוק כמו הרגעים שהיא מתעדת.',
    image: '/magnets.png',
    isProminent: false,
    price: '1,190',
  },
  {
    id: 2,
    title: 'עמדת צילום AI',
    text: 'אצלנו לא מדובר בעוד עמדת צילום משעממת, העמדה שלנו היא אטרקציה שלא רואים באף אירוע אחר!\n\nבחירת מגוון עצום של אפקטים מיוחדים של AI, ותוספות מיוחדות (כמו: שטיח אדום, עמודי חבלול, חצובות תאורה, מראה מעוצבת עם שמות המתחתנים), הופכים את העמדה שלנו לאטרקציה יפה, מחמיאה, ומזמינה שהאורחים לא שוכחים.',
    image: '/main.png',
    isProminent: true,
    badgeText: 'הבחירה הפופולרית',
    price: '1,890',
  },
  {
    id: 3,
    title: 'צילום סטילס',
    text: 'צלמים מקצועיים שיתפסו את כל הרגעים החשובים באירוע שלכם, החיוכים, ההתרגשות, הקסם של האירוע שלכם והכל, בצורה הכי מחמיאה ויפה שיש.',
    image: '/service1.png',
    isProminent: false,
    price: '1,490',
  }
];

export function ServicesSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Track hovered state for cards and buttons
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<number | null>(null);

  // Safely inject web-specific, crash-free stylesheet to document head on Web platform
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('services-web-style')) {
        const style = document.createElement('style');
        style.id = 'services-web-style';
        style.textContent = `
          .service-card-web {
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
            cursor: pointer !important;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3) !important;
          }
          .service-card-web-prominent {
            box-shadow: 0 20px 50px rgba(0, 86, 219, 0.12) !important;
          }
          .service-card-web-hovered {
            transform: translateY(-8px) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
            background-color: rgba(255, 255, 255, 0.04) !important;
          }
          .service-card-web-prominent-hovered {
            transform: translateY(-10px) scale(1.02) !important;
            border-color: #0056DB !important;
            box-shadow: 0 30px 60px rgba(0, 86, 219, 0.3) !important;
            background-color: rgba(0, 86, 219, 0.05) !important;
          }
          .service-glow-overlay {
            background-image: radial-gradient(circle at top, rgba(0, 86, 219, 0.15) 0%, transparent 60%) !important;
          }
          .service-btn-web {
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .service-btn-web-prominent-hovered {
            box-shadow: 0 8px 20px rgba(0, 86, 219, 0.4) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <View style={StyleSheet.flatten([styles.container, isMobile && styles.mobileContainer])}>
      {/* Title */}
      <Text style={StyleSheet.flatten([styles.mainTitle, isMobile && styles.mobileMainTitle])}>השירותים שלנו</Text>

      <View style={StyleSheet.flatten([styles.grid, isMobile && styles.mobileGrid])}>
        {SERVICES_DATA.map((item, index) => {
          const isHovered = hoveredCard === index;
          const isBtnHovered = hoveredBtn === index;
          const imageSrc = typeof item.image === 'number' ? item.image : { uri: item.image };

          // Build classes dynamic array
          const cardClasses = [
            'service-card-web',
            item.isProminent && 'service-card-web-prominent',
            isHovered && 'service-card-web-hovered',
            item.isProminent && isHovered && 'service-card-web-prominent-hovered',
          ].filter(Boolean).join(' ');

          const btnClasses = [
            'service-btn-web',
            item.isProminent && isBtnHovered && 'service-btn-web-prominent-hovered',
          ].filter(Boolean).join(' ');

          return (
            <Pressable
              key={item.id}
              onHoverIn={() => !isMobile && setHoveredCard(index)}
              onHoverOut={() => !isMobile && setHoveredCard(null)}
              style={StyleSheet.flatten([
                styles.card,
                !isMobile ? styles.desktopCard : styles.mobileCard,
                (item.isProminent && !isMobile) ? styles.prominentCard : null,
                isHovered ? styles.cardHovered : null,
                (item.isProminent && isHovered) ? styles.prominentCardHovered : null,
              ])}
              {...(Platform.OS === 'web' ? { className: cardClasses } : {})}
            >
              {item.isProminent && Platform.OS === 'web' && (
                <View
                  style={StyleSheet.absoluteFillObject}
                  {...(Platform.OS === 'web' ? { className: 'service-glow-overlay' } : {})}
                  pointerEvents="none"
                />
              )}

              <View style={StyleSheet.flatten([styles.imageWrapper, item.isProminent && styles.prominentImageWrapper, isMobile && styles.mobileImageWrapper])}>
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

              <View style={StyleSheet.flatten([styles.cardContent, isMobile && styles.mobileCardContent])}>
                <Text style={StyleSheet.flatten([styles.cardTitle, item.isProminent && styles.prominentTitle, isMobile && styles.mobileCardTitle])}>
                  {item.title}
                </Text>
                <Text style={StyleSheet.flatten([styles.cardText, isMobile && styles.mobileCardText])}>
                  {item.text}
                </Text>

                {/* Footer Row: Align Button and Price next to each other */}
                <View style={StyleSheet.flatten([styles.footerRow, isMobile && styles.mobileFooterRow])}>

                  {/* Price Block */}
                  <View style={StyleSheet.flatten([styles.priceBlock, isMobile && styles.mobilePriceBlock])}>
                    <Text style={styles.priceLabel}>החל מ-</Text>
                    <View style={styles.priceTextRow}>
                      <Text style={StyleSheet.flatten([styles.priceValue, item.isProminent && styles.prominentPriceValue])}>{item.price}</Text>
                      <Text style={styles.priceCurrency}>₪</Text>
                    </View>
                  </View>

                  {/* Button: לפרטים נוספים */}
                  <Link href="/booking" asChild>
                    <Pressable
                      onHoverIn={() => !isMobile && setHoveredBtn(index)}
                      onHoverOut={() => !isMobile && setHoveredBtn(null)}
                      style={StyleSheet.flatten([
                        styles.ctaButton,
                        item.isProminent ? styles.prominentCtaButton : styles.outlineCtaButton,
                        isMobile ? styles.mobileCtaButton : null,
                        isBtnHovered ? styles.ctaButtonHovered : null,
                        (item.isProminent && isBtnHovered) ? styles.prominentCtaButtonHovered : null,
                        (!item.isProminent && isBtnHovered) ? styles.outlineCtaButtonHovered : null,
                      ])}
                      {...(Platform.OS === 'web' ? { className: btnClasses } : {})}
                    >
                      <Text style={[
                        styles.ctaButtonText,
                        !item.isProminent && styles.outlineCtaText,
                        !item.isProminent && isBtnHovered && styles.outlineCtaTextHovered
                      ]}>
                        לפרטים והזמנה
                      </Text>
                    </Pressable>
                  </Link>

                </View>
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
  mobileContainer: {
    paddingVertical: 60,
    paddingHorizontal: 16,
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
    fontSize: 34,
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
    gap: 32,
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
  },
  card: {
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
  desktopCard: {
    flex: 1,
  },
  prominentCard: {
    flex: 1.15,
    borderColor: 'rgba(0, 86, 219, 0.25)',
    backgroundColor: 'rgba(0, 86, 219, 0.03)',
    transform: Platform.OS === 'web' ? [{ scale: 1.01 }] : [],
  },
  mobileCard: {
    width: '100%',
    maxWidth: 450,
  },
  // Hover styles utilizing active state transitions for buttery smooth response
  cardHovered: {
    transform: [{ translateY: -8 }],
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  prominentCardHovered: {
    transform: [{ translateY: -10 }, { scale: 1.02 }],
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
  mobileImageWrapper: {
    height: 200,
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
  mobileCardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileCardTitle: {
    fontSize: 24,
    marginBottom: 12,
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
  mobileCardText: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 0,
    marginBottom: 24,
  },
  // Footer Row container
  footerRow: {
    flexDirection: 'row-reverse', // Align button to the left and price to the right (RTL flow)
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 24,
    gap: 16,
  },
  mobileFooterRow: {
    flexDirection: 'column-reverse', // Price on top of full-width button
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingTop: 16,
  },
  // Price Block Styles
  priceBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mobilePriceBlock: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
    fontFamily: 'Google Sans, sans-serif',
  },
  priceTextRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 2,
  },
  priceValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Google Sans, sans-serif',
  },
  prominentPriceValue: {
    color: '#3b82f6',
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  priceCurrency: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    fontFamily: 'Google Sans, sans-serif',
  },
  // Button Styles
  ctaButton: {
    flex: 1,
    maxWidth: 180,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCtaButton: {
    flex: 0,
    width: '100%',
    maxWidth: '100%',
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
    fontSize: 15,
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

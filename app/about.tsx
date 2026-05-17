import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { ContactSection } from '@/components/home/ContactSection';
import { Footer } from '@/components/Footer';

export default function AboutScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ambient Glowing Blobs */}
        <View style={[styles.glowBlob, styles.blueBlob]} pointerEvents="none" />
        <View style={[styles.glowBlob, styles.purpleBlob]} pointerEvents="none" />

        {/* About Main Section */}
        <View style={styles.aboutContainer}>
          <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>קצת עלינו</Text>
          
          <View style={[styles.contentRow, isMobile && styles.mobileContentRow]}>
            {/* Left Column: Large Logo */}
            <View style={[styles.logoColumn, isMobile && styles.mobileLogoColumn]}>
              <Image 
                source={require('@/assets/images/logo.png')} 
                style={styles.largeLogo}
                resizeMode="contain"
              />
            </View>

            {/* Right Column: Description (Placeholder Hebrew Text) */}
            <View style={styles.textColumn}>
              <Text style={[styles.sectionSubtitle, isMobile && styles.mobileTextAlign]}>
                פתרונות צילום מתקדמים וחכמים לאירועים מנצחים
              </Text>
              
              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
                הקמנו את NextClip מתוך תשוקה אמיתית להפוך רגעים חולפים לאירועים בלתי נשכחים. אנו מתמחים בפיתוח ויישום פתרונות צילום חכמים מבוססי בינה מלאכותית (AI) ועמדות סלפי יוקרתיות מעץ מלא, המעניקות חוויה אינטראקטיבית וסוחפת לכל האורחים שלכם.
              </Text>
              
              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
                החזון שלנו הוא לשלב טכנולוגיה קולנועית פורצת דרך יחד עם שירות חם ומקצועי, כדי שכל תמונה שיוצאת מהאירוע שלכם תרגיש כמו יצירת אמנות. אנו מלווים אתכם לאורך כל הדרך – החל מהתכנון ועד להפקת גלריית אירוע אינטרנטית מרהיבה ואינסופית בזמן אמת.
              </Text>

              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
                העמדות שלנו מיוצרות מעץ איכותי המעניק מראה חמים, יוקרתי וכפרי, לצד טכנולוגיית הדפסה תרמית מהירה במיוחד ואפקטי AI מהדור הבא שישאירו את האורחים שלכם פעורי פה.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section copied exactly 1-to-1 from index */}
        <View style={styles.contactWrapper}>
          <ContactSection />
        </View>

        {/* Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
    paddingTop: 90, // Accounts for sticky header
  },
  scrollContent: {
    flexGrow: 1,
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.1,
    pointerEvents: 'none',
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      },
    }),
  },
  blueBlob: {
    top: '10%',
    left: '-10%',
    width: 500,
    height: 500,
    backgroundColor: '#2563eb',
  },
  purpleBlob: {
    top: '30%',
    right: '-10%',
    width: 600,
    height: 600,
    backgroundColor: '#8b5cf6',
  },
  aboutContainer: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'right',
    marginBottom: 40,
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileMainTitle: {
    textAlign: 'center',
    fontSize: 36,
    marginBottom: 24,
  },
  contentRow: {
    flexDirection: 'row', // Left: Logo, Right: Text
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 60,
  },
  mobileContentRow: {
    flexDirection: 'column-reverse', // Logo below or above, text on top
    gap: 32,
  },
  logoColumn: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  mobileLogoColumn: {
    alignItems: 'center',
    width: '100%',
  },
  largeLogo: {
    width: 320,
    height: 180,
  },
  textColumn: {
    flex: 1.4,
    gap: 20,
  },
  sectionSubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#38bdf8', // Glowing highlight matching brand theme
    textAlign: 'right',
    lineHeight: 34,
    marginBottom: 10,
    fontFamily: 'Google Sans, sans-serif',
  },
  descriptionText: {
    fontSize: 18,
    color: '#cbd5e1',
    lineHeight: 28,
    textAlign: 'right',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileTextAlign: {
    textAlign: 'center',
  },
  contactWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: '100%',
    marginTop: 40,
  },
});

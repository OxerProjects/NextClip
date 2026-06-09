import { Footer } from '@/components/Footer';
import { ContactSection } from '@/components/home/ContactSection';
import { Colors } from '@/constants/theme';
import React from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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
הקמנו את NextClip מתוך תשוקה אמיתית להפוך רגעים חולפים לזיכרונות בלתי נשכחים, עם דגש על שירות אישי, איכות ללא פשרות ומקצועיות ברמה הגבוהה ביותר.
              </Text>
              
              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
אנחנו מתמחים בעמדות צילום לאירועים, שמשלבות חוויה אינטראקטיבית, עיצוב יוקרתי וטכנולוגיה מתקדמת – כדי שכל אורח ייהנה מחוויה חלקה, מהנה ומדויקת.
              </Text>

              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
                השירות שלנו שם את הלקוח והאורחים במרכז: ליווי מלא משלב התכנון ועד סוף האירוע, זמינות גבוהה, סבלנות וגישה נעימה לכל אורח, והקפדה על כל פרט קטן, כדי להבטיח חוויה זורמת, מכבדת ומהנה לכל מי שלוקח חלק באירוע.
              </Text>
              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
על האיכות שלנו אנו לא מתפשרים! והיא באה לידי ביטוי בציוד מתקדם, חומרים איכותיים , ותוצרים שנראים מצוין בכל אירוע.
              </Text>
              <Text style={[styles.descriptionText, isMobile && styles.mobileTextAlign]}>
המקצועיות שלנו מורגשת בשטח – בעבודה מסודרת, עמידה בזמנים, ויכולת להפוך כל אירוע לחוויה זורמת ומרשימה.
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
    textAlign: 'right',
    fontSize: 36,
    marginBottom: 24,
  },
  contentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 60,
  },
  mobileContentRow: {
    flexDirection: 'column',
    gap: 32,
  },
  logoColumn: {
    flex: 1,
    alignItems: 'flex-end',
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
    textAlign: 'right',
  },
  contactWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: '100%',
    marginTop: 40,
  },
});

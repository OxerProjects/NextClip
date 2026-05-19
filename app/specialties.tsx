import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Platform, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { Link } from 'expo-router';
import { ContactSection } from '@/components/home/ContactSection';
import { Footer } from '@/components/Footer';

const SPECIALTIES_DATA = [
  {
    id: 1,
    title: 'חתונות ואירועי יוקרה',
    subtitle: 'תיעוד הרגעים המרגשים והאינטימיים ביותר',
    text: 'יום החתונה שלכם מורכב מרגעים יחידים במינם. עמדת ה-AI החדשנית שלנו ומערכת המגנטים הסופר-מהירה מאפשרים לאורחים שלכם לקבל מזכרות מעוצבות, יוקרתית ומרגשות בזמן אמת, תוך שמירה על המראה האצילי והאקסקלוסיבי של האולם שלכם.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200',
    alignLeft: true, // Left Image, Right Text
  },
  {
    id: 2,
    title: 'בר/בת מצווה ואירועים משפחתיים',
    subtitle: 'חוויה אינטראקטיבית וסוחפת לכל הדורות',
    text: 'לחגוג ציון דרך משפחתי דורש אטרקציה שתלהיב ותחבר את כולם – מהילדים והחברים של חתן/כלת השמחה ועד לסבא וסבתא. עמדת ה-AI מעניקה פילטרים מיוחדים ומחמיאים שמעסיקים את הצעירים ומייצרים התלהבות שיא לאורך כל הערב.',
    image: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09?q=80&w=1200',
    alignLeft: false, // Right Image, Left Text
  },
  {
    id: 3,
    title: 'אירועי חברות והפקות עסקיות',
    subtitle: 'מיתוג חכם, נוכחות דיגיטלית וחווית משתמש מותאמת אישית',
    text: 'אנו מתאימים את התמונות, המגנטים וממשק המשתמש של ה-AI באופן אישי לצבעי המותג, ללוגו ולמסרים השיווקיים של החברה שלכם. פתרון מושלם ליצירת באזז אורגני ושיח חיובי ברשתות החברתיות במהלך ואחרי האירוע.',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200',
    alignLeft: true, // Left Image, Right Text
  },
  {
    id: 4,
    title: 'מסיבות פרטיות וימי הולדת',
    subtitle: 'להפוך כל מסיבה לחגיגה צבעונית מלאת סטייל',
    text: 'עמדות הצילום היוקרתיות שלנו מעץ טבעי משתלבות בצורה מושלמת בעיצוב של כל בית, וילה או גן אירועים. הן יוצרות פינת צילום מגנטית ואטרקטיבית שבה כל החברים רוצים להצטלם שוב ושוב וליהנות ממזכרת מושלמת.',
    image: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?q=80&w=1200',
    alignLeft: false, // Right Image, Left Text
  }
];

export default function SpecialtiesScreen() {
  const { width, height: screenHeight } = useWindowDimensions();
  const isMobile = width < 768;

  // Render a single full screen section
  const renderSection = (item: typeof SPECIALTIES_DATA[0], index: number) => {
    // Alternate order for desktop: true -> image left, text right. false -> image right, text left.
    // In RTL flow, a Row layout starts from right.
    const showImageFirstInRtl = !item.alignLeft; 

    return (
      <View 
        key={item.id} 
        style={StyleSheet.flatten([
          styles.section, 
          { minHeight: isMobile ? undefined : screenHeight },
          isMobile && styles.mobileSection,
          index % 2 === 0 ? styles.darkSection : styles.deepDarkSection
        ])}
      >
        <View style={StyleSheet.flatten([styles.sectionContent, isMobile && styles.mobileSectionContent])}>
          
          {/* Layout wrapping row */}
          <View style={StyleSheet.flatten([
            styles.layoutRow, 
            isMobile && styles.mobileLayoutRow,
            (!isMobile && showImageFirstInRtl) && styles.layoutRowReversed
          ])}>
            
            {/* Image Box */}
            <View style={StyleSheet.flatten([
              styles.imageBox, 
              !isMobile ? styles.desktopImageBox : styles.mobileImageBox
            ])}>
              <Image 
                source={{ uri: item.image }} 
                style={styles.sectionImage} 
                resizeMode="cover"
              />
              {/* Sleek Gradient Overlay over image */}
              <View style={styles.imageOverlay} />
            </View>

            {/* Text Box */}
            <View style={StyleSheet.flatten([
              styles.textBox, 
              !isMobile ? styles.desktopTextBox : styles.mobileTextBox
            ])}>
              <Text style={styles.sectionNumber}>0{index + 1}</Text>
              
              <Text style={StyleSheet.flatten([styles.sectionTitle, isMobile && styles.mobileSectionTitle])}>
                {item.title}
              </Text>
              
              <Text style={StyleSheet.flatten([styles.sectionSubtitle, isMobile && styles.mobileSectionSubtitle])}>
                {item.subtitle}
              </Text>
              
              <Text style={StyleSheet.flatten([styles.sectionText, isMobile && styles.mobileSectionText])}>
                {item.text}
              </Text>

              {/* Order Button / כפתור להזמנה */}
              <Link href="/booking" asChild>
                <Pressable style={StyleSheet.flatten([styles.orderButton, isMobile && styles.mobileOrderButton])}>
                  <Text style={styles.orderButtonText}>להזמנת תאריך</Text>
                </Pressable>
              </Link>
            </View>

          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Spacing Area */}
        <View style={styles.headerSpacer}>
          <Text style={[styles.mainTitle, isMobile && styles.mobileMainTitle]}>תחומי התמחות</Text>
          <Text style={styles.mainSubtitle}> NextClip מתאימה את האטרקציה המנצחת בדיוק לאופי ולאווירה של האירוע שלכם </Text>
        </View>

        {/* 4 alternating full screen sections */}
        {SPECIALTIES_DATA.map((item, index) => renderSection(item, index))}

        {/* Contact wrapper copying index 1:1 */}
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSpacer: {
    paddingTop: 150, // Accounts for sticky header
    paddingBottom: 60,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  mainTitle: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Google Sans, sans-serif',
    textShadowColor: 'rgba(0, 86, 219, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  mobileMainTitle: {
    fontSize: 36,
  },
  mainSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: 'Google Sans, sans-serif',
    maxWidth: 600,
    lineHeight: 28,
  },
  section: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  mobileSection: {
    paddingVertical: 50,
    minHeight: undefined,
  },
  darkSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  deepDarkSection: {
    backgroundColor: 'rgba(9, 15, 29, 0.85)',
  },
  sectionContent: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
  },
  mobileSectionContent: {
    paddingHorizontal: 20,
  },
  layoutRow: {
    flexDirection: 'row-reverse', // Standard RTL flow: Text Right, Image Left
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 60,
    width: '100%',
  },
  layoutRowReversed: {
    flexDirection: 'row', // Reverses it: Image Right, Text Left
  },
  mobileLayoutRow: {
    flexDirection: 'column', // Stacks vertically: Image top, Text below
    gap: 32,
  },
  imageBox: {
    height: 480,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  desktopImageBox: {
    flex: 1.1,
  },
  mobileImageBox: {
    width: '100%',
    height: 260,
    borderRadius: 16,
  },
  sectionImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  textBox: {
    alignItems: 'flex-end', // Align text to right in Hebrew RTL flow
    direction: 'rtl',
  },
  desktopTextBox: {
    flex: 0.9,
  },
  mobileTextBox: {
    width: '100%',
    alignItems: 'center',
  },
  sectionNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: 'rgba(0, 86, 219, 0.15)',
    fontFamily: 'Google Sans, sans-serif',
    marginBottom: -20,
    lineHeight: 64,
  },
  sectionTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'right',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileSectionTitle: {
    fontSize: 26,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 20,
    textAlign: 'right',
    fontFamily: 'Google Sans, sans-serif',
  },
  mobileSectionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 17,
    color: '#cbd5e1',
    lineHeight: 28,
    textAlign: 'right',
    fontFamily: 'Google Sans, sans-serif',
    marginBottom: 32,
  },
  mobileSectionText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  orderButton: {
    backgroundColor: '#0056DB',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0056DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  mobileOrderButton: {
    width: '100%',
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Google Sans, sans-serif',
  },
  contactWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: '100%',
  },
});

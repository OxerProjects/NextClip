import { Colors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

// ─── Pricing ──────────────────────────────────────────────────────────────────

function calcBoothPrice(guests: number) {
  if (guests <= 300) return 1650;
  if (guests <= 500) return 1800;
  if (guests <= 700) return 1950;
  if (guests < 1000) return 2500;
  return 3000;
}

function calcMagnetsPrice(guests: number) {
  if (guests <= 100) return 1200;
  if (guests <= 200) return 1350;
  if (guests <= 300) return 1500;
  if (guests <= 400) return 1600;
  return 1700;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICES_DATA: Record<string, {
  id: string; title: string; subtitle: string; descriptionImage: string;
  badgeText?: string; description: string; features: string[];
  galleryImages: string[]; galleryType: 'wood' | 'clothesline' | 'film';
  bookingSlug: string;
}> = {
  magnets: {
    id: 'magnets', title: 'מגנטים', subtitle: 'מזכרת מעוצבת שנשארת לנצח',
    descriptionImage: '/magnets.png',
    description: 'כל מגנט מעוצב באופן אישי לבחירתכם ולפי סגנון האירוע. על החומרים שלנו אנחנו לא מתפשרים – תוצאה של מזכרת מעוצבת, יוקרתית ועמידה בדיוק כמו הרגעים שהיא מתעדת.',
    features: ['עיצוב אישי לפי סגנון האירוע', 'חומרים איכותיים ועמידים', 'הדפסה באיכות פרימיום', 'מסירה מיידית באירוע', 'כמות ללא הגבלה', 'אפשרות ללוגו ושמות', 'צילום מקצועי'],
    galleryImages: ['/magnets/m1.jpeg', '/magnets/m2.jpeg', '/magnets/m3.jpeg', '/magnets/m4.jpeg', '/magnets/m5.jpeg', '/magnets/m6.jpeg', '/magnets/m7.jpeg', '/magnets/m8.jpeg', '/magnets/m9.jpeg'],
    galleryType: 'clothesline', bookingSlug: 'magnets',
  },
  'ai-booth': {
    id: 'ai-booth', title: 'עמדת צילום AI', subtitle: 'האטרקציה החדשנית שהאורחים שלכם לא ישכחו',
    descriptionImage: '/emda/e7.png', badgeText: 'הבחירה הפופולרית',
    description: 'לא עוד עמדת צילום משעממת – העמדה שלנו היא אטרקציה שלא רואים באף אירוע אחר.         עמדת צילום AI מהודרת הכוללת אביזרים, תאורה מקצועית והדפסת מגנטים איכותיים שכל אורח ישמח לקבל.',
    features: ['מגוון עצום של אפקטי AI מיוחדים', 'שיתוף מיידי לנייד', 'גלריה דיגיטלית לכל האורחים', 'הדפסה על מגנט', 'חצובות תאורה מקצועיות', 'מראה מעוצבת עם שמות המתחתנים', 'יצירת אפקטים בהתאמה אישית', 'שטיח אדום + עמודי חבלול', 'בליווי אנשי צוות'],
    galleryImages: ['/emda/e7.png', '/emda/e1.jpeg', '/emda/e2.jpeg', '/emda/e4.jpeg', '/emda/e5.jpeg', '/emda/e6.png', '/emda/e8.png', '/emda/e9.jpeg', '/emda/e10.jpeg', '/emda/e11.jpeg', '/emda/e12.jpeg', '/emda/e13.jpeg'],
    galleryType: 'wood', bookingSlug: 'booth',
  },
  stills: {
    id: 'stills', title: 'צילום סטילס', subtitle: 'כל רגע, בצורה הכי מחמיאה שיש',
    descriptionImage: '/cam.webp', badgeText: 'הבחירה של הלקוחות שלנו',
    description: 'צלמים מנוסים המקפידים על תיעוד מקצועי של הרגעים החשובים ביותר, עם דגש על איכות, רגש ותשומת לב לכל פרט.',
    features: ['ציוד צילום מתקדם', 'עריכה מקצועית לכל התמונות', 'מסירת גלריה דיגיטלית', 'זכויות שימוש מלאות', 'תיאום מראש עם הצוות', 'קבלת התמונות בדיסק-און-קי '],
    galleryImages: ['/magnets/m1.jpeg', '/magnets/m2.jpeg', '/magnets/m3.jpeg', '/magnets/m4.jpeg', '/magnets/m5.jpeg', '/magnets/m6.jpeg', '/magnets/m7.jpeg', '/magnets/m8.jpeg', '/magnets/m9.jpeg'],
    galleryType: 'film', bookingSlug: 'stills',
  },
};

const SERVICE_SLUG_MAP: Record<string, string> = { '1': 'magnets', '2': 'ai-booth', '3': 'stills' };

// ─── Booth effects (before / after) ─────────────────────────────────────────────
//
//  ❗ כאן מוסיפים / מעדכנים את האפקטים של עמדת הצילום.
//
//  כל אפקט = זוג תמונות שנמצאות בתיקייה  public/emda/ :
//     before = התמונה הרגילה              (לדוגמה  e22.jpeg)
//     after  = אותה תמונה עם האפקט         (לדוגמה  e22_2.jpeg)
//
//  כדי להוסיף אפקט חדש:
//     1. שמרו את שתי התמונות בתוך  public/emda/  (רגילה + גרסת ה־_2).
//     2. הוסיפו כאן שורה חדשה עם השם הרצוי והנתיבים.
//
//  כדי לשנות את שם האפקט שמופיע באתר — פשוט ערכו את השדה  name.
//  ⚠️ השמות למטה הם זמניים (placeholders) — שנו אותם כך שיתאימו לאפקט שבכל תמונה.
const BOOTH_EFFECTS: { name: string; before: string; after: string }[] = [
  { name: 'קריקטורה',       before: '/emda/e14.jpeg', after: '/emda/e14_2.jpeg' },
  { name: 'צניחה חופשית',      before: '/emda/e15.jpeg', after: '/emda/e15_2.jpeg' },
  { name: 'על השטיח האדום',        before: '/emda/e16.jpeg', after: '/emda/e16_2.jpeg' },
  { name: 'קוקטל בשקיעה',         before: '/emda/e17.jpeg', after: '/emda/e17_2.jpeg' },
  { name: 'חד קרן',     before: '/emda/e18.jpeg', after: '/emda/e18_2.jpeg' },
  { name: 'קריקטורה מצחיקה',         before: '/emda/e19.jpeg', after: '/emda/e19_2.jpeg' },
  { name: 'תחפושת דובי',        before: '/emda/e20.jpeg', after: '/emda/e20_2.jpeg' },
  { name: 'קטלוג VOGUE',      before: '/emda/e21.jpeg', after: '/emda/e21_2.jpeg' },
  { name: 'DJ',         before: '/emda/e22.jpeg', after: '/emda/e22_2.jpeg' },
  { name: 'ציור שמן',      before: '/emda/e23.jpeg', after: '/emda/e23_2.jpeg' },
  { name: 'חבלניות מהעתיד',        before: '/emda/e24.jpeg', after: '/emda/e24_2.jpeg' },
  { name: 'אנימה',           before: '/emda/e25.jpeg', after: '/emda/e25_2.jpeg' },
  { name: 'דיסני פיקסאר',         before: '/emda/e26.jpeg', after: '/emda/e26_2.jpeg' },
  { name: 'מצויר',          before: '/emda/e27.jpeg', after: '/emda/e27_2.jpeg' },
  { name: 'שחור לבן',       before: '/emda/e28.jpeg', after: '/emda/e28_2.jpeg' },
  { name: 'ניאון',    before: '/emda/e29.jpeg', after: '/emda/e29_2.jpeg' },
];

// ─── Wooden frame ─────────────────────────────────────────────────────────────

function WoodenFrame({ uri, size, tilt }: { uri: string; size: number; tilt: string }) {
  const pad = Math.round(size * 0.065);
  const matPad = Math.round(size * 0.02);
  return (
    <View style={{ transform: [{ rotate: tilt }], margin: 10 }}>
      {Platform.OS === 'web' ? (
        <div style={{
          width: size, height: size, borderRadius: 5,
          padding: pad,
          background: `
            repeating-linear-gradient(86deg,
              rgba(255,240,200,0.12) 0px, rgba(255,240,200,0.12) 1px,
              transparent 1px, transparent 5px
            ),
            repeating-linear-gradient(94deg,
              rgba(180,130,60,0.08) 0px, rgba(180,130,60,0.08) 1px,
              transparent 1px, transparent 18px
            ),
            linear-gradient(120deg,
              #D4A355 0%, #C49040 12%, #E8BC6A 22%,
              #C49040 35%, #D9A850 48%, #BF8A38 58%,
              #E0B260 70%, #C49040 82%, #D4A355 100%
            )`,
          boxShadow: 'inset 0 2px 6px rgba(255,230,160,0.5), inset 0 -3px 6px rgba(0,0,0,0.35), 0 12px 36px rgba(0,0,0,0.6)',
          position: 'relative',
        } as any}>
          {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', width: 8, height: 8, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #F0D080, #A07830)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)', ...pos,
            } as any} />
          ))}
          <div style={{
            width: '100%', height: '100%', padding: matPad,
            background: '#F8F2E4',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          } as any}>
            <img src={uri} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as any} />
          </div>
        </div>
      ) : (
        <View style={{ width: size, height: size, borderRadius: 5, padding: pad, backgroundColor: '#C49040' }}>
          <View style={{ flex: 1, backgroundColor: '#F8F2E4', padding: matPad, overflow: 'hidden' }}>
            <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Clothesline marquee (magnets) — infinite horizontal scroll ───────────────

function ClotheslineMarquee({ images, isMobile }: { images: string[]; isMobile: boolean }) {
  const photoW  = isMobile ? 108 : 150;
  const photoH  = Math.round(photoW * 1.38);
  const hangW   = isMobile ? 26 : 34;
  const gap     = isMobile ? 22 : 36;
  const tilts   = ['-3.5deg', '2.5deg', '-1.5deg', '3deg', '-2.5deg', '1.5deg', '-1deg', '3.5deg'];
  const doubled = [...images, ...images];
  const ropeH         = 22;                  // ← layout only — don't touch
  const ropeDisplayH  = isMobile ? 44 : 60; // ← change THIS for rope visual height
  const ropeTopPad    = isMobile ? 8 : 14;  // ← how much clothespin shows above rope
  const ropeTopAdjust = ropeTopPad;          // rope img starts at container y=0
  const pivotY        = ropeTopPad + Math.round(ropeH / 2); // tilt pivot at rope contact
  const photoMT       = -Math.round(hangW * 1.8); // photo top at clothespin mid (natural ratio 216/60=3.6, half=1.8)

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sid = 'cl-marquee-css';
    if (!document.getElementById(sid)) {
      const s = document.createElement('style');
      s.id = sid;
      s.textContent = `
        @keyframes cl-scroll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .cl-track {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          width: max-content !important;
          align-items: flex-start !important;
          animation: cl-scroll 30s linear infinite;
        }
        .cl-track:hover { animation-play-state: paused; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          {images.map((uri, i) => (
            <View key={i} style={{ width: photoW, backgroundColor: '#fff', padding: 6, paddingBottom: 20 }}>
              <Image source={{ uri }} style={{ width: photoW - 12, height: photoH }} resizeMode="cover" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingBottom: 32 }}>
      <div style={{ direction: 'ltr', overflow: 'hidden', width: '100%', position: 'relative', paddingTop: ropeTopPad + ropeH } as any}>
        {/* Full-width rope — sits behind clothespins (zIndex:1 < item zIndex:3) */}
        <img
          src="/rope.png"
          style={{
            position: 'absolute', top: ropeTopPad - ropeTopAdjust, left: 0,
            width: '100%', height: ropeDisplayH,
            objectFit: 'cover', objectPosition: 'center 50%',
            zIndex: 1, pointerEvents: 'none',
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0, black 7px, black ${ropeDisplayH - 10}px, transparent ${ropeDisplayH}px)`,
            maskImage: `linear-gradient(to bottom, transparent 0, black 7px, black ${ropeDisplayH - 10}px, transparent ${ropeDisplayH}px)`,
          } as any}
        />
        <div className="cl-track">
          {doubled.map((uri, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingLeft: gap, paddingRight: gap,
                transform: `rotate(${tilts[i % tilts.length]})`,
                transformOrigin: `center ${pivotY}px`,
                position: 'relative', zIndex: 3,
                marginTop: -(ropeTopPad + ropeH),
              } as any}
            >
              {/* position:relative activates zIndex so clip appears in front of photo top */}
              <img src="/hang.png" style={{ width: hangW, height: 'auto', display: 'block', position: 'relative', zIndex: 2 } as any} />
              <div style={{
                width: photoW, backgroundColor: '#fff',
                padding: isMobile ? 5 : 7, paddingBottom: isMobile ? 22 : 30,
                boxShadow: '0 12px 40px rgba(0,0,0,0.75), 0 3px 10px rgba(0,0,0,0.4)',
                marginTop: photoMT, flexShrink: 0,
                position: 'relative', zIndex: 1,
              } as any}>
                <img src={uri} style={{ width: '100%', height: photoH, objectFit: 'cover', display: 'block' } as any} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </View>
  );
}

// ─── Film strip marquee (stills) — infinite horizontal scroll ────────────────

function FilmScrollMarquee({ images, isMobile }: { images: string[]; isMobile: boolean }) {
  const frameW    = isMobile ? 210 : 270;
  const frameH    = Math.round(frameW * 0.65);
  const perfH     = 24;
  const perfCount = 5;
  const doubled   = [...images, ...images];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sid = 'film-scroll-css';
    if (!document.getElementById(sid)) {
      const s = document.createElement('style');
      s.id = sid;
      s.textContent = `
        @keyframes film-scroll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .film-scroll-track {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          width: max-content !important;
          background: #0a0a0a;
          animation: film-scroll 22s linear infinite;
        }
        .film-scroll-track:hover { animation-play-state: paused; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 24 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: frameW, height: frameH }} resizeMode="cover" />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const Perfs = () => (
    <div style={{ display: 'flex', backgroundColor: '#060606', height: perfH, alignItems: 'center', padding: '0 4px', justifyContent: 'space-around' } as any}>
      {Array.from({ length: perfCount }).map((_, j) => (
        <div key={j} style={{ width: Math.floor(frameW / perfCount / 2.4), height: 14, borderRadius: 3, backgroundColor: '#1a1a1a', border: '1px solid #282828' } as any} />
      ))}
    </div>
  );

  return (
    <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28 }}>
      <div style={{ direction: 'ltr', overflow: 'hidden', width: '100%' } as any}>
        <div className="film-scroll-track">
          {doubled.map((uri, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', width: frameW, flexShrink: 0, borderRight: '2px solid #060606', backgroundColor: '#0a0a0a' } as any}>
              <Perfs />
              <div style={{ position: 'relative', width: frameW, height: frameH } as any}>
                <img src={uri} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'contrast(1.05) saturate(0.9)' } as any} />
                <div style={{ position: 'absolute', bottom: 4, left: 6, color: '#f97316', fontSize: 8, fontFamily: 'monospace', letterSpacing: 1, opacity: 0.8 } as any}>
                  {String((i % images.length) + 1).padStart(2, '0')}A
                </div>
              </div>
              <Perfs />
            </div>
          ))}
        </div>
      </div>
    </View>
  );
}

// ─── Wood marquee (infinite auto-scroll, 2× size) ────────────────────────────

function WoodMarquee({ images, screenWidth, isMobile }: { images: string[]; screenWidth: number; isMobile: boolean }) {
  const frameSize = isMobile ? Math.max(130, Math.round(screenWidth * 0.34)) : 180;
  const tilts = ['-1.5deg', '1deg', '-0.8deg', '1.5deg'];
  const doubled = [...images, ...images];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sid = 'wood-marquee-css';
    if (!document.getElementById(sid)) {
      const s = document.createElement('style');
      s.id = sid;
      s.textContent = `
        @keyframes wood-scroll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .wood-track {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          width: max-content !important;
          animation: wood-scroll 24s linear infinite;
        }
        .wood-track:hover { animation-play-state: paused; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' }}>
          {images.map((uri, i) => <WoodenFrame key={i} uri={uri} size={Math.min(120, frameSize)} tilt={tilts[i % 4]} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28 }}>
      {/* direction:ltr on container mirrors GalleryMarquee pattern — without it RTL
          flips the overflow direction and breaks the translate3d(-50%) loop */}
      <div style={{ direction: 'ltr', overflow: 'hidden', width: '100%', userSelect: 'none' } as any}>
        <div className="wood-track">
          {doubled.map((uri, i) => (
            <WoodenFrame key={i} uri={uri} size={frameSize} tilt={tilts[i % 4]} />
          ))}
        </div>
      </div>
    </View>
  );
}

// ─── Gallery dispatcher ───────────────────────────────────────────────────────

function Gallery({ images, type, isMobile, screenWidth }: {
  images: string[]; type: 'wood' | 'clothesline' | 'film'; isMobile: boolean; screenWidth: number;
}) {
  if (type === 'film') return <FilmScrollMarquee images={images} isMobile={isMobile} />;
  if (type === 'clothesline') return <ClotheslineMarquee images={images} isMobile={isMobile} />;
  return <WoodMarquee images={images} screenWidth={screenWidth} isMobile={isMobile} />;
}

// ─── Booth icon — fixed-width container, 2nd fades in smoothly ───────────────

function BoothIcon({ count }: { count: number }) {
  const secondOpacity = useRef(new Animated.Value(count === 2 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(secondOpacity, {
      toValue: count === 2 ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [count]);

  const SingleBooth = () => (
    <View style={boothIconStyles.wrap}>
      <View style={boothIconStyles.body}>
        <View style={boothIconStyles.screen} />
        <View style={boothIconStyles.strip} />
        <View style={boothIconStyles.slot} />
      </View>
      <View style={boothIconStyles.stand} />
      <View style={boothIconStyles.base} />
    </View>
  );

  return (
    <View style={boothIconStyles.container}>
      <SingleBooth />
      <Animated.View style={{ opacity: secondOpacity }}>
        <SingleBooth />
      </Animated.View>
    </View>
  );
}

const boothIconStyles = StyleSheet.create({
  container: { flexDirection: 'row-reverse', gap: 4, alignItems: 'flex-end', width: 68 },
  wrap: { alignItems: 'center' },
  body: {
    width: 26, height: 40, borderRadius: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', paddingTop: 4, paddingHorizontal: 3, gap: 2,
  },
  screen: { width: 16, height: 16, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  strip: { width: '100%', height: 3, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  slot: { width: 12, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  stand: { width: 3, height: 9, backgroundColor: 'rgba(255,255,255,0.3)' },
  base: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
});

// ─── Guest meter — slim bar ───────────────────────────────────────────────────

function GuestMeter({ guests, min, max, onChange, serviceId, isMobile }: {
  guests: number; min: number; max: number; onChange: (n: number) => void; serviceId: string; isMobile?: boolean;
}) {
  const anim = useRef(new Animated.Value(guests)).current;
  const [display, setDisplay] = useState(guests);

  useEffect(() => {
    Animated.timing(anim, { toValue: guests, duration: 280, useNativeDriver: false }).start();
    const l = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(l);
  }, [guests]);

  const pct = (guests - min) / (max - min);
  const STEPS = serviceId === 'magnets'
    ? [50, 100, 150, 200, 300, 400, 500]
    : [50, 100, 200, 300, 400, 500, 600, 700, 800, 1000];

  return (
    <View style={StyleSheet.flatten([meterStyles.box, isMobile ? meterStyles.boxMobile : null])}>
      <View style={meterStyles.topRow}>
        <Text style={meterStyles.label}>כמות האורחים</Text>
        <Text style={meterStyles.count}>{display.toLocaleString()}</Text>
      </View>

      {Platform.OS === 'web' ? (
        <input type="range" min={min} max={max} step="50" value={guests}
          onChange={e => onChange(parseInt(e.target.value) || min)}
          style={{
            width: '100%', height: '6px', borderRadius: '3px',
            background: `linear-gradient(to right, #3b82f6 ${pct * 100}%, #1e293b ${pct * 100}%)`,
            outline: 'none', cursor: 'pointer', direction: 'ltr', WebkitAppearance: 'none',
          } as any}
        />
      ) : (
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
          {STEPS.map(n => (
            <Pressable key={n} onPress={() => onChange(n)}
              style={StyleSheet.flatten([meterStyles.step, guests === n ? meterStyles.stepOn : null])}>
              <Text style={StyleSheet.flatten([meterStyles.stepTxt, guests === n ? meterStyles.stepTxtOn : null])}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

    </View>
  );
}

const meterStyles = StyleSheet.create({
  box: {
    gap: 6, minWidth: 180, maxWidth: 240,
  },
  boxMobile: {
    minWidth: 0, maxWidth: '100%', width: '100%',
  },
  topRow: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', width: '100%' },
  label: { color: '#94a3b8', fontSize: 13, fontFamily: 'Assistant_400Regular' },
  count: { fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: 'Assistant_700Bold' },
  rangeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%' },
  rangeLabel: { color: '#334155', fontSize: 10, fontFamily: 'Assistant_400Regular' },
  step: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: '#2d3748', backgroundColor: '#131c2e' },
  stepOn: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  stepTxt: { color: '#475569', fontSize: 11, fontFamily: 'Assistant_400Regular' },
  stepTxtOn: { color: '#fff', fontWeight: 'bold' },
});

// ─── Price bar ────────────────────────────────────────────────────────────────

function PriceBar({ serviceId, router, bookingSlug, guests, onGuestsChange, isMobile }: {
  serviceId: string; router: any; bookingSlug: string; guests: number; onGuestsChange: (n: number) => void; isMobile?: boolean;
}) {
  const getPrice = () => {
    if (serviceId === 'ai-booth') return calcBoothPrice(guests);
    if (serviceId === 'magnets') return calcMagnetsPrice(guests);
    return 1300;
  };
  const isStills = serviceId === 'stills';
  const price = getPrice();
  const boothCount = serviceId === 'ai-booth' ? (guests > 700 ? 2 : 1) : 0;

  const animP = useRef(new Animated.Value(price)).current;
  const [dispPrice, setDispPrice] = useState(price);
  useEffect(() => {
    Animated.timing(animP, { toValue: price, duration: 320, useNativeDriver: false }).start();
    const l = animP.addListener(({ value }) => setDispPrice(Math.round(value)));
    return () => animP.removeListener(l);
  }, [price]);

  return (
    <View style={StyleSheet.flatten([barStyles.bar, isMobile ? barStyles.barMobile : null])}>
      {/* Right: price + booth icon */}
      <View style={StyleSheet.flatten([barStyles.priceCol, isMobile ? barStyles.priceColMobile : null])}>
        <View style={barStyles.priceRow}>
          <Text style={barStyles.priceNum}>{dispPrice.toLocaleString()}</Text>
          <Text style={barStyles.priceSym}>₪</Text>
          {boothCount > 0 && (
            <View style={barStyles.boothWrap}>
              <BoothIcon count={boothCount} />
              {boothCount === 2 && <Text style={barStyles.boothLabel}>× 2</Text>}
            </View>
          )}
        </View>
        <Text style={barStyles.priceSub}>ל-3 שעות</Text>
      </View>

      {/* Meter — right next to price (stacks below on mobile) */}
      {!isStills && (
        <>
          {!isMobile && <View style={barStyles.sep} />}
          <GuestMeter guests={guests} min={50} max={1000} onChange={onGuestsChange} serviceId={serviceId} isMobile={isMobile} />
        </>
      )}

      {/* CTA — far left on desktop, full-width on mobile */}
      <Pressable style={StyleSheet.flatten([barStyles.cta, isMobile ? barStyles.ctaMobile : null])}
        onPress={() => router.push(`/booking?service=${bookingSlug}`)}
        {...(Platform.OS === 'web' ? { className: 'price-cta' } : {})}>
        <Text style={barStyles.ctaText}>להזמנה</Text>
      </Pressable>
    </View>
  );
}

const barStyles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(7,14,28,0.8)',
    borderTopWidth: 1, borderTopColor: 'rgba(59,130,246,0.15)',
    borderRadius: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 20, gap: 32,
    alignSelf: 'center',
    width: '92%',
    maxWidth: 780,
    marginTop: 32, marginBottom: 40,
    ...Platform.select({ web: { boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' } as any }),
  },
  barMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 18,
    paddingHorizontal: 20, paddingVertical: 18,
    width: '92%',
  },
  priceCol: { alignItems: 'flex-end' },
  priceColMobile: { alignItems: 'flex-end', width: '100%' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  priceNum: { fontSize: 40, fontWeight: '900', color: '#fff', fontFamily: 'Assistant_700Bold', lineHeight: 44 },
  priceSym: { fontSize: 18, color: '#475569', fontFamily: 'Assistant_700Bold' },
  boothWrap: { alignItems: 'center', gap: 2, marginRight: 4 },
  boothLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Assistant_400Regular' },
  priceSub: { fontSize: 12, color: '#64748b', fontFamily: 'Assistant_400Regular', textAlign: 'right', marginTop: 2 },
  sep: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.07)' },
  cta: {
    backgroundColor: '#0056DB', paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
    ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,86,219,0.45)', transition: 'all 0.18s ease' } as any }),
  },
  ctaMobile: { width: '100%', paddingVertical: 16 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: 'bold', fontFamily: 'Assistant_700Bold' },
});

// ─── Before / After slider ─────────────────────────────────────────────────────

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50); // % from the left where the split sits
  const containerRef = useRef<any>(null);
  const dragging = useRef(false);

  if (Platform.OS !== 'web') {
    // Native fallback — show the "after" image (slider is a web interaction).
    return (
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
        <Image source={{ uri: after }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      </View>
    );
  }

  const moveTo = (clientX: number) => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={(e: any) => { dragging.current = true; try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {} moveTo(e.clientX); }}
      onPointerMove={(e: any) => { if (dragging.current) moveTo(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
      style={{
        position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden',
        cursor: 'ew-resize', userSelect: 'none', touchAction: 'none',
        boxShadow: '0 8px 40px rgba(0,0,0,0.55)', background: '#0a0a0a',
      } as any}
    >
      {/* AFTER (with effect) — base layer, defines the height */}
      <img src={after} draggable={false}
        style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' } as any} />

      {/* BEFORE (original) — overlaid and clipped to the left portion */}
      <img src={before} draggable={false}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover', display: 'block', pointerEvents: 'none',
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
        } as any} />

      {/* Labels */}
      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, padding: '4px 12px', borderRadius: 99, fontFamily: 'Assistant_400Regular', pointerEvents: 'none' } as any}>לפני</div>
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,86,219,0.9)', color: '#fff', fontSize: 12, padding: '4px 12px', borderRadius: 99, fontFamily: 'Assistant_700Bold', fontWeight: 700, pointerEvents: 'none' } as any}>אחרי</div>

      {/* Divider + drag handle */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 3, marginLeft: -1.5, background: '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.6)', pointerEvents: 'none' } as any}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 44, height: 44, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        } as any}>
          <span style={{ color: '#0056DB', fontSize: 20, fontWeight: 700, lineHeight: 1 } as any}>⇄</span>
        </div>
      </div>
    </div>
  );
}

// ─── Effects showcase (booth page) ──────────────────────────────────────────────

function EffectsShowcase({ isMobile }: { isMobile: boolean }) {
  const [selected, setSelected] = useState(0);
  const effect = BOOTH_EFFECTS[selected];
  const thumbSize = isMobile ? 80 : 112;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const sid = 'fx-thumb-css';
    let s = document.getElementById(sid) as HTMLStyleElement | null;
    if (!s) { s = document.createElement('style'); s.id = sid; document.head.appendChild(s); }
    s.textContent = `
      .fx-thumb { transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
      .fx-thumb:hover { transform: scale(1.03); }
      .fx-panel::-webkit-scrollbar { width: 3px; }
      .fx-panel::-webkit-scrollbar-track { background: transparent; }
      .fx-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
      .fx-hmob::-webkit-scrollbar { height: 3px; }
      .fx-hmob::-webkit-scrollbar-track { background: transparent; }
      .fx-hmob::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
    `;
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.flatten([fxStyles.section, isMobile ? fxStyles.sectionMobile : null])}>
        <Text style={fxStyles.title}>האפקטים שבעמדה</Text>
        <Text style={fxStyles.subtitle}>בחרו אפקט וגררו את הסליידר כדי לראות את הקסם — לפני ואחרי</Text>

        {isMobile ? (
          /* MOBILE: viewer full width, horizontal thumb scroll below */
          <>
            <View style={fxStyles.viewerFull}>
              <BeforeAfterSlider key={selected} before={effect.before} after={effect.after} />
            </View>
            <div className="fx-hmob" style={{ width: '100%', overflowX: 'auto', marginTop: 16, paddingBottom: 6 } as any}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 10, width: 'max-content', direction: 'rtl' } as any}>
                {BOOTH_EFFECTS.map((e, i) => (
                  <div key={i} className="fx-thumb" onClick={() => setSelected(i)}
                    style={{ position: 'relative', width: thumbSize, height: thumbSize, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                      border: `2px solid ${i === selected ? '#0056DB' : 'rgba(255,255,255,0.12)'}`,
                      boxShadow: i === selected ? '0 0 0 3px rgba(0,86,219,0.22)' : 'none',
                    } as any}
                  >
                    <img src={e.after} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as any} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
                      padding: '16px 6px 5px',
                    } as any}>
                      <span style={{ color: '#fff', fontSize: 10, fontFamily: 'Assistant_700Bold', fontWeight: '700',
                        textAlign: 'center', display: 'block', direction: 'rtl',
                      } as any}>{e.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* DESKTOP: 50/50 — viewer LEFT, 2-col image grid RIGHT */
          <div style={{ display: 'flex', flexDirection: 'row', direction: 'rtl', gap: 20, alignItems: 'flex-start', width: '100%' } as any}>

            {/* RIGHT: 2-column flex-wrap grid, text overlay on images */}
            <div className="fx-panel" style={{ flex: 1, maxHeight: 560, overflowY: 'auto', overflowX: 'hidden' } as any}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, direction: 'rtl' } as any}>
                {BOOTH_EFFECTS.map((e, i) => (
                  <div key={i} className="fx-thumb" onClick={() => setSelected(i)}
                    style={{
                      position: 'relative',
                      width: 'calc(33.33% - 6px)',
                      aspectRatio: '1',
                      borderRadius: 12, overflow: 'hidden',
                      border: `2px solid ${i === selected ? '#0056DB' : 'rgba(255,255,255,0.10)'}`,
                      boxShadow: i === selected ? '0 0 0 3px rgba(0,86,219,0.28)' : 'none',
                    } as any}
                  >
                    <img src={e.after} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as any} />
                    {/* name overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)',
                      padding: '28px 10px 8px',
                    } as any}>
                      <span style={{
                        color: '#fff', fontSize: 13,
                        fontFamily: 'Assistant_700Bold', fontWeight: '700',
                        textAlign: 'right', display: 'block', direction: 'rtl',
                      } as any}>{e.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LEFT: BeforeAfterSlider fills the other 50% */}
            <div style={{ flex: 1, minWidth: 0, direction: 'ltr' } as any}>
              <BeforeAfterSlider key={selected} before={effect.before} after={effect.after} />
            </div>
          </div>
        )}

        {/* Link to full effects gallery */}
        <div style={{ marginTop: 18, textAlign: 'right', direction: 'rtl' } as any}>
          <a
            href="https://photobooth.alive-pic.com/landing-page/243bbc5a-53ee-4cd2-add1-ae8399ba3461"
            target="_blank" rel="noopener noreferrer"
            style={{
              color: '#60a5fa', fontSize: 15, fontFamily: 'Assistant_400Regular',
              textDecoration: 'none', display: 'inline-block',
            } as any}
          >
            ← לצפייה בכל האפקטים המלאים
          </a>
        </div>
      </View>
    );
  }

  /* Native fallback */
  return (
    <View style={StyleSheet.flatten([fxStyles.section, fxStyles.sectionMobile])}>
      <Text style={fxStyles.title}>האפקטים שבעמדה</Text>
      <Text style={fxStyles.subtitle}>בחרו אפקט וגררו את הסליידר כדי לראות את הקסם — לפני ואחרי</Text>
      <View style={fxStyles.viewerFull}>
        <BeforeAfterSlider key={selected} before={effect.before} after={effect.after} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 10 }}>
        {BOOTH_EFFECTS.map((e, i) => (
          <Pressable key={`${i}_${selected === i ? 1 : 0}`} onPress={() => setSelected(i)} style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === selected ? '#0056DB' : 'rgba(255,255,255,0.12)' }}>
              <Image source={{ uri: e.after }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Text style={{ color: i === selected ? '#fff' : '#94a3b8', fontSize: 10, fontFamily: 'Assistant_400Regular', textAlign: 'center', maxWidth: 80 }}>{e.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const fxStyles = StyleSheet.create({
  section: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 48, paddingTop: 64, paddingBottom: 8 },
  sectionMobile: { paddingHorizontal: 20, paddingTop: 44 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', fontFamily: 'Assistant_700Bold', textAlign: 'right', width: '100%' },
  subtitle: { fontSize: 16, color: '#94a3b8', fontFamily: 'Assistant_400Regular', textAlign: 'right', width: '100%', marginTop: 8, marginBottom: 28 },
  viewerFull: { width: '100%', alignSelf: 'center' as any },
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [guests, setGuests] = useState(200);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'svc-styles-v6';
      if (!document.getElementById(id)) {
        const s = document.createElement('style');
        s.id = id;
        s.textContent = `
          .price-cta:hover { background:#0043b0 !important; transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,86,219,0.6) !important; }
          .feat-chip:hover { background:rgba(59,130,246,0.1) !important; border-color:rgba(59,130,246,0.35) !important; }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance:none; width:20px; height:20px; border-radius:50%;
            background:radial-gradient(circle, #60a5fa, #2563eb);
            cursor:pointer; border:2px solid #fff;
            box-shadow:0 0 8px rgba(59,130,246,0.8);
          }
        `;
        document.head.appendChild(s);
      }
    }
  }, []);

  const slugKey = id ? (SERVICE_SLUG_MAP[id] ?? id) : '';
  const service = SERVICES_DATA[slugKey];

  if (!service) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>שירות לא נמצא</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero ──────────────────────────────────────────── */}
          <View style={StyleSheet.flatten([styles.hero, isMobile ? styles.heroMobile : null])}>
            {service.badgeText && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⭐ {service.badgeText}</Text>
              </View>
            )}
            <Text style={StyleSheet.flatten([styles.heroTitle, isMobile ? styles.heroTitleMobile : null])}>
              {service.title}
            </Text>
            <Text style={StyleSheet.flatten([styles.heroSub, isMobile ? styles.heroSubMobile : null])}>
              {service.subtitle}
            </Text>
          </View>

          {/* ── Gallery ───────────────────────────────────────── */}
          <Gallery images={service.galleryImages} type={service.galleryType} isMobile={isMobile} screenWidth={width} />

          {/* ── Content ───────────────────────────────────────── */}
          <View style={StyleSheet.flatten([styles.content, isMobile ? styles.contentMobile : null])}>
            <View style={StyleSheet.flatten([styles.descCol, isMobile ? styles.descColMobile : null])}>
              <Text style={styles.secTitle}>על השירות</Text>
              <Text style={StyleSheet.flatten([styles.desc, isMobile ? styles.descMobile : null])}>{service.description}</Text>
              <Text style={[styles.secTitle, { marginTop: 28 }]}>מה כלול?</Text>
              <View style={styles.chips}>
                {service.features.map((f, i) => (
                  <View key={i} style={styles.chip} {...(Platform.OS === 'web' ? { className: 'feat-chip' } : {})}>
                    <Text style={styles.chipCheck}>✓</Text>
                    <Text style={styles.chipText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={StyleSheet.flatten([styles.imgCol, isMobile ? styles.imgColMobile : null])}>
              <Image
                source={{ uri: service.descriptionImage }}
                style={StyleSheet.flatten([styles.img, isMobile ? styles.imgMobile : null])}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* ── Effects showcase — booth page only ────────────── */}
          {service.id === 'ai-booth' && <EffectsShowcase isMobile={isMobile} />}

          {/* ── Price bar — in scroll, at bottom ─────────────── */}
          <PriceBar
            serviceId={service.id} router={router} bookingSlug={service.bookingSlug}
            guests={guests} onGuestsChange={setGuests} isMobile={isMobile}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.background, paddingTop: 82 },
  scroll: { paddingBottom: 0 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.background },
  notFoundText: { color: '#fff', fontSize: 24, textAlign: 'right', fontFamily: 'Assistant_400Regular' },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 40, paddingTop: 40, paddingBottom: 36,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  heroMobile: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  badge: {
    backgroundColor: 'rgba(0,86,219,0.18)',
    borderWidth: 1, borderColor: 'rgba(0,86,219,0.4)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, marginBottom: 16,
  },
  badgeText: { color: '#60a5fa', fontSize: 13, fontWeight: 'bold', fontFamily: 'Assistant_700Bold' },
  heroTitle: {
    fontSize: 76, fontWeight: '900', color: '#fff',
    fontFamily: 'Assistant_700Bold', textAlign: 'center', lineHeight: 82,
  },
  heroTitleMobile: { fontSize: 50, lineHeight: 56 },
  heroSub: {
    fontSize: 20, color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Assistant_400Regular', textAlign: 'center', marginTop: 10,
  },
  heroSubMobile: { fontSize: 16 },

  content: {
    flexDirection: 'row', paddingHorizontal: 48, paddingTop: 52, gap: 48, alignItems: 'flex-start',
    maxWidth: 1200, alignSelf: 'center', width: '100%',
  },
  contentMobile: { flexDirection: 'column', paddingHorizontal: 20, paddingTop: 32, gap: 28 },
  descCol: { flex: 1.3, alignItems: 'flex-end' },
  descColMobile: { width: '100%' },
  secTitle: {
    fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 14,
    fontFamily: 'Assistant_700Bold', textAlign: 'right', width: '100%',
  },
  desc: {
    fontSize: 17, color: '#94a3b8', lineHeight: 30, textAlign: 'right',
    fontFamily: 'Assistant_400Regular', width: '100%',
  },
  descMobile: { fontSize: 15, lineHeight: 26 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 4, justifyContent: 'flex-end' },
  chip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    ...Platform.select({ web: { transition: 'all 0.18s ease', cursor: 'default' } as any }),
  },
  chipCheck: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },
  chipText: { color: '#e2e8f0', fontSize: 14, fontFamily: 'Assistant_400Regular', textAlign: 'right' },
  imgCol: { flex: 1 },
  imgColMobile: { width: '100%' },
  img: {
    width: '100%', height: 360, borderRadius: 18,
    ...Platform.select({ web: { boxShadow: '0 8px 40px rgba(0,0,0,0.6)' } as any }),
  },
  imgMobile: { height: 220, borderRadius: 14 },
});

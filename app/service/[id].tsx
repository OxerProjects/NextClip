import { Colors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    galleryImages: ['/magnets/m1.jpeg', '/magnets/m2.jpeg', '/magnets/m3.jpeg', '/magnets/m4.jpeg', '/magnets/m5.jpeg'],
    galleryType: 'clothesline', bookingSlug: 'magnets',
  },
  'ai-booth': {
    id: 'ai-booth', title: 'עמדת צילום AI', subtitle: 'האטרקציה החדשנית שהאורחים שלכם לא ישכחו',
    descriptionImage: '/emda1.png', badgeText: 'הבחירה הפופולרית',
    description: 'לא עוד עמדת צילום משעממת – העמדה שלנו היא אטרקציה שלא רואים באף אירוע אחר.         עמדת צילום AI מהודרת הכוללת אביזרים, תאורה מקצועית והדפסת מגנטים איכותיים שכל אורח ישמח לקבל.',
    features: ['מגוון עצום של אפקטי AI מיוחדים', 'שיתוף מיידי לנייד', 'גלריה דיגיטלית לכל האורחים', 'הדפסה על מגנט', 'חצובות תאורה מקצועיות', 'מראה מעוצבת עם שמות המתחתנים', 'יצירת אפקטים בהתאמה אישית', 'שטיח אדום + עמודי חבלול', 'בליווי אנשי צוות'],
    galleryImages: ['/emda2.png', '/emda1.png', '/main.png', '/emda1.png'],
    galleryType: 'wood', bookingSlug: 'booth',
  },
  stills: {
    id: 'stills', title: 'צילום סטילס', subtitle: 'כל רגע, בצורה הכי מחמיאה שיש',
    descriptionImage: '/service1.png',
    description: 'צלמים מנוסים המקפידים על תיעוד מקצועי של הרגעים החשובים ביותר, עם דגש על איכות, רגש ותשומת לב לכל פרט.',
    features: ['ציוד צילום מתקדם', 'עריכה מקצועית לכל התמונות', 'מסירת גלריה דיגיטלית', 'זכויות שימוש מלאות', 'תיאום מראש עם הצוות', 'קבלת התמונות בדיסק-און-קי '],
    galleryImages: ['/service1.png', '/service1.png', '/service1.png', '/service1.png'],
    galleryType: 'film', bookingSlug: 'stills',
  },
};

const SERVICE_SLUG_MAP: Record<string, string> = { '1': 'magnets', '2': 'ai-booth', '3': 'stills' };

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

// ─── Clothesline (magnets) ────────────────────────────────────────────────────

// Positions of each clothespin as % from the left edge of the clothesline image.
// Adjust these if your image has different pin spacing.
const PIN_POSITIONS_PCT = [17, 31, 50, 69, 83];
// How far down (% of image height) the clothespin grip sits (top of the photo).
const PIN_Y_PCT = 58;

// Realistic wooden spring clothespin matching the reference photo style.
function Clothespin({ tilt = 0 }: { tilt?: number }) {
  const W = 18, H = 44;
  return (
    <div style={{
      width: W, height: H, position: 'relative',
      transform: `rotate(${tilt}deg)`,
      filter: 'drop-shadow(1px 4px 5px rgba(0,0,0,0.7))',
      zIndex: 3,
    } as any}>
      {/* left arm */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: W / 2 - 0.5, height: H,
        borderRadius: `${W * 0.45}px ${W * 0.12}px ${W * 0.22}px ${W * 0.45}px`,
        background: 'linear-gradient(100deg, #9A6E38 0%, #D4A55A 22%, #C49040 50%, #A87830 75%, #8C6228 100%)',
      } as any} />
      {/* right arm */}
      <div style={{
        position: 'absolute', right: 0, top: 0,
        width: W / 2 - 0.5, height: H,
        borderRadius: `${W * 0.12}px ${W * 0.45}px ${W * 0.45}px ${W * 0.22}px`,
        background: 'linear-gradient(260deg, #9A6E38 0%, #C49040 22%, #D4A55A 50%, #B88840 75%, #8C6228 100%)',
      } as any} />
      {/* wood grain lines */}
      {[0.25, 0.5, 0.72].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', left: 2, right: 2,
          top: `${pos * 100}%`, height: 0.7,
          background: 'rgba(80,45,10,0.28)',
        } as any} />
      ))}
      {/* center seam */}
      <div style={{
        position: 'absolute', left: '50%', top: 2, width: 1, height: H - 4, marginLeft: -0.5,
        background: 'rgba(60,35,8,0.55)',
      } as any} />
      {/* metal spring ring */}
      <div style={{
        position: 'absolute', left: -1, right: -1, top: H * 0.44, height: 5,
        borderRadius: 3,
        background: 'linear-gradient(180deg, #D8D8DC 0%, #A0A0A8 45%, #787880 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
      } as any} />
      {/* highlight */}
      <div style={{
        position: 'absolute', left: 2, top: 3, width: W * 0.25, height: H * 0.35,
        borderRadius: '50%',
        background: 'rgba(255,235,180,0.18)',
      } as any} />
    </div>
  );
}

function ClotheslineGallery({ images, screenWidth, isMobile }: { images: string[]; screenWidth: number; isMobile: boolean }) {
  // Pins sit ~14% of the width apart at their tightest; size photos to that gap
  // so on narrow screens they hang with only a slight overlap instead of piling up.
  const photoW = isMobile ? Math.max(54, Math.round(screenWidth * 0.165)) : 138;
  const photoH = Math.round(photoW * 1.35);
  const tilts  = [-3.5, 2, -1.5, 3, -2.5];

  // Dynamically measure the clothesline image height after it loads
  const [imgH, setImgH] = useState(Math.round(screenWidth / 2.5));
  const onImgLoad = useCallback((e: any) => {
    const el: HTMLImageElement = e.target ?? e.nativeEvent?.target;
    if (el?.naturalWidth) {
      setImgH(Math.round(screenWidth * el.naturalHeight / el.naturalWidth));
    }
  }, [screenWidth]);

  if (Platform.OS !== 'web') {
    // ── Native fallback ──────────────────────────────────────────────────
    const step  = photoW * 0.9;
    const total = step * (images.length - 1);
    const lefts = images.map((_, i) => screenWidth / 2 - total / 2 + i * step);
    return (
      <View style={{ width: '100%', backgroundColor: '#000', paddingVertical: 32 }}>
        <View style={{ position: 'relative', height: photoH + 60 }}>
          <View style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 3, backgroundColor: '#C9B492' }} />
          {images.map((uri, i) => (
            <View key={i} style={{
              position: 'absolute', left: lefts[i] - photoW / 2, top: 36,
              width: photoW, transform: [{ rotate: `${tilts[i % tilts.length]}deg` }],
            }}>
              <View style={{ width: 12, height: 28, backgroundColor: '#D2B176', borderRadius: 4, alignSelf: 'center', zIndex: 2 }} />
              <View style={{ width: photoW, height: photoH, backgroundColor: '#fff', padding: 5, marginTop: -8 }}>
                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Web ──────────────────────────────────────────────────────────────────────
  // clothesline.png has a pure-black bg → mix-blend-mode:screen makes black disappear.
  // Photos sit in a layer behind the image, anchored at each clothespin position.
  const pins    = PIN_POSITIONS_PCT.slice(0, images.length);
  const pinYpx  = Math.round(imgH * (PIN_Y_PCT / 100));
  const totalH  = pinYpx + photoH + 28;   // container just tall enough for photos

  return (
    <View style={{ width: '100%', backgroundColor: '#000' }}>
      <div style={{ position: 'relative', width: '100%', height: totalH } as any}>

        {/* ── Photos behind the rope ── */}
        {pins.map((leftPct, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${leftPct}%`,
            top: pinYpx,
            transform: `translateX(-50%) rotate(${tilts[i % tilts.length]}deg)`,
            transformOrigin: 'top center',
            zIndex: 1,
          } as any}>
            <div style={{
              width: photoW,
              backgroundColor: '#fff',
              padding: isMobile ? 5 : 6,
              paddingBottom: isMobile ? 20 : 26,
              boxShadow: '0 10px 30px rgba(0,0,0,0.85), 0 3px 10px rgba(0,0,0,0.5)',
            } as any}>
              <img
                src={images[i]}
                style={{ width: '100%', height: photoH, objectFit: 'cover', display: 'block' } as any}
              />
            </div>
          </div>
        ))}

        {/* ── Clothesline image on top — mix-blend-mode removes black bg ── */}
        <img
          src="/clothesline.png"
          onLoad={onImgLoad}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: imgH,
            objectFit: 'fill',        // preserve exact proportions
            mixBlendMode: 'screen',   // black = transparent
            pointerEvents: 'none',
            zIndex: 2,
            display: 'block',
          } as any}
        />
      </div>
    </View>
  );
}

// ─── Film strip (stills) — static, full width ─────────────────────────────────

function FilmMarquee({ images, screenWidth, isMobile }: { images: string[]; screenWidth: number; isMobile: boolean }) {
  const perfH = 24;
  const perfCount = 5;
  const frameW = Math.floor(screenWidth / images.length);
  const frameH = Math.round(frameW * 0.65);

  const PerfRow = ({ frameWidth }: { frameWidth: number }) => (
    <View style={{ flexDirection: 'row', backgroundColor: '#060606', height: perfH }}>
      {images.map((_, i) => (
        <View key={i} style={{ width: frameWidth, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 4 }}>
          {Array.from({ length: perfCount }).map((__, j) => (
            <View key={j} style={{ width: Math.floor(frameWidth / perfCount / 2.4), height: 14, borderRadius: 3, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#282828' }} />
          ))}
        </View>
      ))}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28, overflow: 'hidden' as any }}>
        <div style={{ transform: 'rotate(-2deg) scaleX(1.05)', transformOrigin: 'center center', backgroundColor: '#0a0a0a' } as any}>
          {/* top perfs */}
          <div style={{ display: 'flex', backgroundColor: '#060606', height: perfH, alignItems: 'center' } as any}>
            {images.map((_, i) => (
              <div key={i} style={{ width: frameW, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 4px', flexShrink: 0 } as any}>
                {Array.from({ length: perfCount }).map((__, j) => (
                  <div key={j} style={{ width: Math.floor(frameW / perfCount / 2.4), height: 14, borderRadius: 3, backgroundColor: '#1a1a1a', border: '1px solid #282828' } as any} />
                ))}
              </div>
            ))}
          </div>
          {/* images */}
          <div style={{ display: 'flex' } as any}>
            {images.map((uri, i) => (
              <div key={i} style={{ width: frameW, height: frameH, flexShrink: 0, borderRight: '2px solid #060606', position: 'relative' } as any}>
                <img src={uri} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'contrast(1.05) saturate(0.9)' } as any} />
                <div style={{ position: 'absolute', bottom: 4, left: 6, color: '#f97316', fontSize: 8, fontFamily: 'monospace', letterSpacing: 1, opacity: 0.8 } as any}>
                  {String(i + 1).padStart(2, '0')}A
                </div>
              </div>
            ))}
          </div>
          {/* bottom perfs */}
          <div style={{ display: 'flex', backgroundColor: '#060606', height: perfH, alignItems: 'center' } as any}>
            {images.map((_, i) => (
              <div key={i} style={{ width: frameW, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 4px', flexShrink: 0 } as any}>
                {Array.from({ length: perfCount }).map((__, j) => (
                  <div key={j} style={{ width: Math.floor(frameW / perfCount / 2.4), height: 14, borderRadius: 3, backgroundColor: '#1a1a1a', border: '1px solid #282828' } as any} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 20 }}>
      <PerfRow frameWidth={frameW} />
      <View style={{ flexDirection: 'row' }}>
        {images.map((uri, i) => <Image key={i} source={{ uri }} style={{ width: frameW, height: frameH }} resizeMode="cover" />)}
      </View>
      <PerfRow frameWidth={frameW} />
    </View>
  );
}

// ─── Gallery dispatcher ───────────────────────────────────────────────────────

function Gallery({ images, type, isMobile, screenWidth }: {
  images: string[]; type: 'wood' | 'clothesline' | 'film'; isMobile: boolean; screenWidth: number;
}) {
  if (type === 'film') return <FilmMarquee images={images} screenWidth={screenWidth} isMobile={isMobile} />;
  if (type === 'clothesline') return <ClotheslineGallery images={images} screenWidth={screenWidth} isMobile={isMobile} />;

  // wood
  const totalGap = 16 * (images.length + 1);
  const frameSize = Math.floor((screenWidth - totalGap) / images.length);
  // Hard cap so the row of frames always fits the viewport: each frame carries
  // 10px margin on both sides (20 total) and the row has 8px padding (16 total).
  const fitSize = Math.floor((screenWidth - 16) / images.length) - 20;
  const clampedSize = Math.min(260, fitSize, Math.max(isMobile ? 64 : 150, frameSize));
  const tilts = ['-1.5deg', '1deg', '-0.8deg', '1.5deg'];

  return (
    <View style={{ width: '100%', backgroundColor: Colors.dark.background, paddingVertical: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, justifyContent: 'center' }}>
        {images.map((uri, i) => <WoodenFrame key={i} uri={uri} size={clampedSize} tilt={tilts[i % 4]} />)}
      </View>
    </View>
  );
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
  label: { color: '#475569', fontSize: 11, fontFamily: 'Assistant_400Regular' },
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

      {/* Spacer pushes CTA to far left (desktop only) */}
      {!isMobile && <View style={{ flex: 1 }} />}

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
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingVertical: 20, gap: 20,
    marginHorizontal: 24, marginTop: 32, marginBottom: 40,
    ...Platform.select({ web: { boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' } as any }),
  },
  barMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 18,
    paddingHorizontal: 20, paddingVertical: 18,
    marginHorizontal: 16,
  },
  priceCol: { alignItems: 'flex-end' },
  priceColMobile: { alignItems: 'flex-end', width: '100%' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  priceNum: { fontSize: 40, fontWeight: '900', color: '#fff', fontFamily: 'Assistant_700Bold', lineHeight: 44 },
  priceSym: { fontSize: 18, color: '#475569', fontFamily: 'Assistant_700Bold' },
  boothWrap: { alignItems: 'center', gap: 2, marginRight: 4 },
  boothLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Assistant_400Regular' },
  priceSub: { fontSize: 12, color: '#334155', fontFamily: 'Assistant_400Regular', textAlign: 'right', marginTop: 2 },
  sep: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.07)' },
  cta: {
    backgroundColor: '#0056DB', paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
    ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,86,219,0.45)', transition: 'all 0.18s ease' } as any }),
  },
  ctaMobile: { width: '100%', paddingVertical: 16 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: 'bold', fontFamily: 'Assistant_700Bold' },
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
      const id = 'svc-styles-v4';
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
  chips: { flexDirection: 'row-reverse', direction: 'rtl', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 4, justifyContent: 'flex-end' },
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

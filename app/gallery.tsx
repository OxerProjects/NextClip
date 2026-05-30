import { Colors } from '@/constants/theme';
import { GalleryImage, getGalleryImages, GRID_TOTAL_WIDTH } from '@/utils/storage';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, DeviceEventEmitter, Dimensions, Image,
  PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Grid constants ────────────────────────────────────────────────────────
const IMG_WIDTH = 300;
const GAP       = 12;
const COLS      = 8;
// TILE_W: one repeating period (grid width + trailing gap → tiles perfectly)
const TILE_W    = GRID_TOTAL_WIDTH + GAP; // 2484 + 12 = 2496

// ─── Zoom limits / defaults ────────────────────────────────────────────────
const DEFAULT_SCALE = 1.0;
const MIN_SCALE     = 0.25;
const MAX_SCALE     = 2.5;
const DECEL         = 0.95;   // inertia deceleration per frame
const STOP_V        = 0.3;    // px/frame below which inertia stops

// ─── Utils ─────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Positive modulo, always returns value in [0, m) */
const posmod = (v: number, m: number) => ((v % m) + m) % m;
const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

export default function GalleryPage() {
  const [images, setImages]               = useState<GalleryImage[]>([]);
  const [categories, setCategories]       = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [ready, setReady]                 = useState(false);
  const [lightboxImg, setLightboxImg]     = useState<GalleryImage | null>(null);

  // ─── DOM refs (web) ───────────────────────────────────────────────────────
  const containerRef = useRef<any>(null);
  const canvasRef    = useRef<any>(null);

  // ─── Camera state (refs → no re-renders during animation) ────────────────
  const panRef    = useRef({ x: 0, y: 0 });
  const scaleRef  = useRef(DEFAULT_SCALE);
  const tileHRef  = useRef(SCREEN_H); // updated whenever masonry height changes

  // ─── Drag tracking ────────────────────────────────────────────────────────
  const draggingRef  = useRef(false);
  const prevPosRef   = useRef({ x: 0, y: 0 });
  const prevTimeRef  = useRef(0);
  const velRef       = useRef({ x: 0, y: 0 });
  const dragDistRef  = useRef(0); // total drag distance for click-vs-drag detection
  const rafRef       = useRef<number | null>(null);

  // ─── Mobile animated values ───────────────────────────────────────────────
  const mobilePan   = useRef(new Animated.ValueXY()).current;
  const mobileScale = useRef(new Animated.Value(DEFAULT_SCALE)).current;

  // ─── Masonry packing ──────────────────────────────────────────────────────
  const { packedList, tileH } = useMemo(() => {
    const filtered = activeCategory
      ? images.filter(i => i.category === activeCategory)
      : images;

    const heights = new Array(COLS).fill(0);
    const packed = filtered.map(img => {
      let minCol = 0;
      for (let c = 1; c < COLS; c++) if (heights[c] < heights[minCol]) minCol = c;
      const top = heights[minCol];
      heights[minCol] += img.height + GAP;
      return { ...img, col: minCol, row_y: top };
    });

    const maxH = Math.max(...heights, SCREEN_H);
    return { packedList: packed, tileH: maxH + GAP };
  }, [images, activeCategory]);

  // Keep tileHRef in sync
  useEffect(() => { tileHRef.current = tileH; }, [tileH]);

  // ─── Core: apply transform to canvas DOM node ─────────────────────────────
  //
  //  Camera model:
  //    panRef.x/y = unbounded virtual position
  //    effective dx = posmod(panX, TILE_W * scale) - TILE_W * scale  ∈ (-TILE_W*s, 0]
  //    screen_x of canvas_point P = P * scale + dx
  //
  //  Because we render 3×3 tiles at canvas coords [0,3*TILE_W) × [0,3*tileH),
  //  the modulo wrapping is invisible — we always see the middle tile surrounded
  //  by seamless copies on all sides.
  //
  const applyTransform = useCallback(() => {
    if (Platform.OS !== 'web' || !canvasRef.current) return;
    const s  = scaleRef.current;
    const sW = TILE_W * s;
    const sH = tileHRef.current * s;
    const dx = posmod(panRef.current.x, sW) - sW;
    const dy = posmod(panRef.current.y, sH) - sH;
    canvasRef.current.style.transform       = `translate3d(${dx}px,${dy}px,0) scale(${s})`;
    canvasRef.current.style.transformOrigin = '0 0';
  }, []);

  // ─── Zoom at a screen pivot (keeps the canvas point under pivot fixed) ────
  const zoomAtPoint = useCallback((newS: number, pivotX: number, pivotY: number) => {
    newS = clamp(newS, MIN_SCALE, MAX_SCALE);
    const s  = scaleRef.current;
    const sW = TILE_W * s;
    const sH = tileHRef.current * s;
    // Current effective display offset
    const dx = posmod(panRef.current.x, sW) - sW;
    const dy = posmod(panRef.current.y, sH) - sH;
    // Canvas point under pivot
    const cpX = (pivotX - dx) / s;
    const cpY = (pivotY - dy) / s;
    // New display offset that keeps that canvas point at the pivot
    const newDX = pivotX - cpX * newS;
    const newDY = pivotY - cpY * newS;
    // Reconstruct panRef from new display offset
    scaleRef.current  = newS;
    panRef.current.x  = newDX + TILE_W * newS;
    panRef.current.y  = newDY + tileHRef.current * newS;
  }, []);

  // ─── Animated button zoom (to screen centre) ──────────────────────────────
  const handleZoom = useCallback((zoomIn: boolean) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const pivX = SCREEN_W / 2;
    const pivY = SCREEN_H / 2;
    const startS  = scaleRef.current;
    const targetS = clamp(startS + (zoomIn ? 0.3 : -0.3), MIN_SCALE, MAX_SCALE);
    // Capture canvas point at pivot before animation
    const sW  = TILE_W * startS;
    const sH  = tileHRef.current * startS;
    const dx  = posmod(panRef.current.x, sW) - sW;
    const dy  = posmod(panRef.current.y, sH) - sH;
    const cpX = (pivX - dx) / startS;
    const cpY = (pivY - dy) / startS;

    const t0 = performance.now();
    const tick = (now: number) => {
      const t   = Math.min((now - t0) / 220, 1);
      const s   = startS + (targetS - startS) * easeOut3(t);
      const nDX = pivX - cpX * s;
      const nDY = pivY - cpY * s;
      scaleRef.current = s;
      panRef.current.x = nDX + TILE_W * s;
      panRef.current.y = nDY + tileHRef.current * s;
      applyTransform();
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform]);

  // ─── Recenter / reset ─────────────────────────────────────────────────────
  //  Target: canvas midpoint at screen centre, scale = DEFAULT_SCALE
  //  panX such that canvas point (TILE_W/2, tileH/2) is at (SCREEN_W/2, SCREEN_H/2):
  //    TILE_W/2 * s + (panX - TILE_W*s) = SCREEN_W/2
  //    panX = SCREEN_W/2 + TILE_W*s/2
  const targetCenterPan = (s = DEFAULT_SCALE) => ({
    x: SCREEN_W / 2 + TILE_W * s / 2,
    y: SCREEN_H / 2 + tileHRef.current * s / 2,
  });

  const handleRecenter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startX = panRef.current.x;
    const startY = panRef.current.y;
    const startS = scaleRef.current;
    const { x: tx, y: ty } = targetCenterPan(DEFAULT_SCALE);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 350, 1);
      const e = easeOut3(t);
      panRef.current.x = startX + (tx - startX) * e;
      panRef.current.y = startY + (ty - startY) * e;
      scaleRef.current = startS + (DEFAULT_SCALE - startS) * e;
      applyTransform();
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform]);

  // ─── Inertia loop ─────────────────────────────────────────────────────────
  const inertiaLoop = useCallback(() => {
    if (draggingRef.current) return;
    velRef.current.x *= DECEL;
    velRef.current.y *= DECEL;
    panRef.current.x += velRef.current.x;
    panRef.current.y += velRef.current.y;
    applyTransform();
    if (Math.abs(velRef.current.x) > STOP_V || Math.abs(velRef.current.y) > STOP_V) {
      rafRef.current = requestAnimationFrame(inertiaLoop);
    }
  }, [applyTransform]);

  // ─── Drag callbacks ───────────────────────────────────────────────────────
  const onDragStart = useCallback((x: number, y: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    draggingRef.current = true;
    prevPosRef.current  = { x, y };
    prevTimeRef.current = performance.now();
    velRef.current      = { x: 0, y: 0 };
    dragDistRef.current = 0;
  }, []);

  const onDragMove = useCallback((x: number, y: number) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt  = Math.max(now - prevTimeRef.current, 1);
    const dx  = x - prevPosRef.current.x;
    const dy  = y - prevPosRef.current.y;

    panRef.current.x   += dx;
    panRef.current.y   += dy;
    dragDistRef.current += Math.abs(dx) + Math.abs(dy);

    // Exponential moving average velocity (px / frame @60fps)
    const alpha = clamp(dt / 16, 0, 1);
    velRef.current.x = velRef.current.x * (1 - alpha) + (dx / dt * 16) * alpha;
    velRef.current.y = velRef.current.y * (1 - alpha) + (dy / dt * 16) * alpha;

    prevPosRef.current  = { x, y };
    prevTimeRef.current = now;
    applyTransform();
  }, [applyTransform]);

  const onDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    rafRef.current = requestAnimationFrame(inertiaLoop);
  }, [inertiaLoop]);

  // ─── Load images ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const data = await getGalleryImages();
      setImages(data);
      setCategories(Array.from(new Set(data.map(i => i.category))));
      setReady(true);
    })();

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('gallery-cursor-style')) {
        const s = document.createElement('style');
        s.id = 'gallery-cursor-style';
        s.textContent = `.gallery-canvas{cursor:grab;user-select:none}.gallery-canvas:active{cursor:grabbing}.gallery-canvas *{user-select:none;-webkit-user-drag:none}`;
        document.head.appendChild(s);
      }
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ─── Re-centre whenever category / tileH changes ──────────────────────────
  useEffect(() => {
    if (!ready || tileH <= GAP) return;
    tileHRef.current = tileH;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const { x: tx, y: ty } = targetCenterPan(DEFAULT_SCALE);
    const isFirstLoad = panRef.current.x === 0 && panRef.current.y === 0;

    if (isFirstLoad) {
      panRef.current = { x: tx, y: ty };
      scaleRef.current = DEFAULT_SCALE;
      setTimeout(applyTransform, 40);
      return;
    }

    const startX = panRef.current.x;
    const startY = panRef.current.y;
    const startS = scaleRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 300, 1);
      const e = easeOut3(t);
      panRef.current.x = startX + (tx - startX) * e;
      panRef.current.y = startY + (ty - startY) * e;
      scaleRef.current = startS + (DEFAULT_SCALE - startS) * e;
      applyTransform();
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeCategory, tileH]);

  // ─── Web event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return;
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown  = (e: MouseEvent) => onDragStart(e.clientX, e.clientY);
    const onMouseMove  = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
    const onMouseUp    = ()              => onDragEnd();
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove  = (e: TouchEvent) => {
      if (e.touches.length === 1) { e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); }
    };
    const onTouchEnd   = () => onDragEnd();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom: zoom at cursor position
        const newS = clamp(scaleRef.current * (1 - e.deltaY * 0.003), MIN_SCALE, MAX_SCALE);
        zoomAtPoint(newS, e.clientX, e.clientY);
      } else {
        panRef.current.x -= e.deltaX * 1.2;
        panRef.current.y -= e.deltaY * 1.2;
      }
      applyTransform();
    };

    el.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);
    el.addEventListener('wheel',      onWheel,       { passive: false });

    return () => {
      el.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
      el.removeEventListener('wheel',      onWheel);
    };
  }, [ready, onDragStart, onDragMove, onDragEnd, zoomAtPoint, applyTransform]);

  // ─── Mobile PanResponder (simplified, non-wrapping) ───────────────────────
  const mobilePR = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderMove: Animated.event(
      [null, { dx: mobilePan.x, dy: mobilePan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: () => {},
  })).current;

  // ─── Lightbox helpers ──────────────────────────────────────────────────────
  const openLightbox  = (img: GalleryImage) => { setLightboxImg(img);  DeviceEventEmitter.emit('lightboxOpen', true);  };
  const closeLightbox = ()                   => { setLightboxImg(null); DeviceEventEmitter.emit('lightboxOpen', false); };

  // ─── 3×3 tile grid ────────────────────────────────────────────────────────
  // We render 9 copies of the masonry grid arranged in a 3×3 super-tile.
  // The CSS modulo wrapping makes them appear infinite — when the camera
  // drifts past one tile boundary, the display offsets wrap seamlessly.
  const TILES: { tc: number; tr: number }[] = useMemo(() => {
    const arr = [];
    for (let tr = 0; tr < 3; tr++) for (let tc = 0; tc < 3; tc++) arr.push({ tc, tr });
    return arr;
  }, []);

  if (!ready) return <View style={styles.container} />;

  // Mobile: derive transform style from Animated values
  const mobileCanvasStyle = Platform.OS !== 'web' ? {
    transform: [
      { translateX: mobilePan.x },
      { translateY: mobilePan.y },
      { scale: mobileScale },
    ],
  } : {};

  return (
    <View style={styles.container}>

      {/* ── Draggable infinite canvas ── */}
      <View
        ref={containerRef}
        style={styles.canvasContainer}
        {...(Platform.OS === 'web' ? { className: 'gallery-canvas' } : {})}
      >
        <Animated.View
          ref={canvasRef}
          style={[{
            position: 'absolute',
            top: 0,
            left: 0,
            width:  TILE_W * 3,
            height: tileH  * 3,
          }, mobileCanvasStyle]}
          {...(Platform.OS !== 'web' ? mobilePR.panHandlers : {})}
        >
          {TILES.flatMap(({ tc, tr }) =>
            packedList.map(img => (
              <TouchableOpacity
                key={`${img.id}-${tc}-${tr}`}
                activeOpacity={0.88}
                onPress={() => {
                  if (dragDistRef.current > 10) return; // ignore if user was dragging
                  openLightbox(img);
                }}
                style={{
                  position: 'absolute',
                  left:   tc * TILE_W + img.col * (IMG_WIDTH + GAP),
                  top:    tr * tileH  + img.row_y,
                  width:  img.width,
                  height: img.height,
                }}
              >
                <Image
                  source={{ uri: img.uri }}
                  style={styles.gridImage}
                />
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      </View>

      {/* ── Gradient overlays ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.35)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* ── Title + category filters ── */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterBtn, !activeCategory && styles.filterBtnActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.filterText, !activeCategory && styles.filterTextActive]}>הכל</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterBtn, activeCategory === cat && styles.filterBtnActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.title}>גלריה</Text>
      </View>

      {/* ── Zoom controls ── */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(true)}>
          <FontAwesome name="plus" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom(false)}>
          <FontAwesome name="minus" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, { marginTop: 12 }]} onPress={handleRecenter}>
          <FontAwesome name="crosshairs" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={closeLightbox}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: lightboxImg.uri }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
        </View>
      )}

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 240,
    pointerEvents: 'none',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 120,
    pointerEvents: 'none',
  },
  topOverlay: {
    position: 'absolute',
    top: 90,
    left: 40,
    right: 40,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
  },
  filters: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '60%',
    justifyContent: 'flex-start',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  filterBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.dark.background,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 32,
    right: 28,
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10,10,20,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    // subtle backdrop blur on web
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } as any : {}),
  },
  lightboxOverlay: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.96)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '92%',
    height: '88%',
  },
});

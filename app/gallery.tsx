import { Seo } from '@/components/Seo';
import { Colors } from '@/constants/theme';
import { GalleryImage, getGalleryImages, GRID_TOTAL_WIDTH } from '@/utils/storage';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, DeviceEventEmitter, Image, PanResponder, Platform,
  StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';

// ─── Grid constants ────────────────────────────────────────────────────────
const IMG_WIDTH = 300;
const GAP       = 12;
const COLS      = 8;
const COL_PITCH = IMG_WIDTH + GAP;
// TILE_W: one repeating period (grid width + trailing gap → tiles perfectly)
const TILE_W    = GRID_TOTAL_WIDTH + GAP; // 2484 + 12 = 2496

// ─── Layout constants ──────────────────────────────────────────────────────
// Every cell is exactly IMG_WIDTH wide — the stored width/height are used only
// as an aspect ratio, never as pixel sizes. That is what makes overlapping
// impossible: a cell can never be wider than its column.
const MIN_ITEM_H     = 190;  // clamp for extreme panoramas
const MAX_ITEM_H     = 460;  // clamp for extreme portraits
const MAX_FILL_EXTRA = 60;   // max px added to a cell to square up a column
const MIN_TILE_H     = 1250; // shortest allowed vertical period
const MAX_TILES      = 3;    // most copies of the period we ever render per axis

// ─── Zoom / motion ─────────────────────────────────────────────────────────
const DEFAULT_SCALE = 1.0;
const SCALE_FLOOR   = 0.22;  // absolute floor; real min is derived per screen
const MAX_SCALE     = 2.6;
const DECEL         = 0.955; // inertia decay per 60fps frame
const STOP_V        = 0.12;  // px/frame below which inertia stops
const MAX_V         = 90;    // fling speed cap (px/frame)

// ─── Utils ─────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Positive modulo, always returns value in [0, m) */
const posmod = (v: number, m: number) => ((v % m) + m) % m;
const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Small deterministic PRNG so a re-layout (resize) keeps the same shuffle. */
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Cell = { key: string; img: GalleryImage; x: number; y: number; h: number };

// ─── The infinite tile builder ─────────────────────────────────────────────
//
//  Produces one seamless period: COLS columns, each exactly `tileH` tall, so
//  the tile repeats forever in both axes with no seams and no empty bands.
//
//  * order is fully shuffled — categories are deliberately mixed, never grouped
//  * images repeat as often as needed to fill the period (that's the point)
//  * the pool is dealt from a reshuffling deck, so repeats are spread out and
//    the same photo avoids sitting next to itself
//
const buildTile = (images: GalleryImage[], viewH: number, seed: number) => {
  const pool = images.map(img => {
    const ratio = img.width > 0 && img.height > 0 ? img.height / img.width : 1;
    return { img, h: Math.round(clamp(IMG_WIDTH * ratio, MIN_ITEM_H, MAX_ITEM_H)) };
  });

  if (pool.length === 0) {
    return { cells: [] as Cell[], tileH: Math.max(viewH || 0, MIN_TILE_H) };
  }

  const rand = mulberry32(seed);
  const avgSlot = pool.reduce((s, p) => s + p.h + GAP, 0) / pool.length;
  // Tall enough to (a) more than cover the viewport and
  // (b) hold every image at least once, so nothing is ever hidden.
  const tileH = Math.round(Math.max(
    MIN_TILE_H,
    (viewH || 0) * 1.2,
    Math.ceil(pool.length / COLS) * avgSlot,
  ));

  let deck = pool.slice();
  let cursor = deck.length; // force a shuffle on first draw

  const reshuffle = () => {
    deck = pool.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cursor = 0;
  };

  const cells: Cell[] = [];
  let prevCol: { id: string; top: number; bottom: number }[] = [];

  for (let c = 0; c < COLS; c++) {
    const col: { img: GalleryImage; h: number }[] = [];
    let y = 0;
    let lastId = '';

    while (tileH - y >= MIN_ITEM_H + GAP) {
      const rem = tileH - y;
      // Near the bottom of a column, start preferring whatever fits best.
      const tight = rem <= MAX_ITEM_H + MIN_ITEM_H + 2 * GAP;
      if (cursor >= deck.length) reshuffle();

      // Look at a small window of the deck and take the nicest fit.
      const end = Math.min(deck.length, cursor + 4);
      let bestI = cursor;
      let bestCost = Infinity;
      for (let i = cursor; i < end; i++) {
        const cand = deck[i];
        let cost = rand() * 30;
        if (cand.h + GAP > rem) cost += 4000 + (cand.h + GAP - rem);
        else if (tight) cost += Math.abs(rem - (cand.h + GAP));
        if (cand.img.id === lastId) cost += 900;               // no vertical twins
        const bottom = y + cand.h;
        if (prevCol.some(p => p.id === cand.img.id && p.top < bottom && p.bottom > y)) {
          cost += 700;                                          // no side-by-side twins
        }
        if (cost < bestCost) { bestCost = cost; bestI = i; }
      }
      const chosen = deck[bestI];
      deck[bestI] = deck[cursor];
      deck[cursor] = chosen;
      cursor++;

      const h = Math.min(chosen.h, rem - GAP); // never spill past the period
      col.push({ img: chosen.img, h });
      lastId = chosen.img.id;
      y += h + GAP;
    }

    // Square the column up to exactly `tileH` so the vertical repeat is
    // seamless. Spare pixels go into the cells first — images are
    // cover-cropped, so a few px only shifts the crop, never distorts —
    // and only the overflow past the cap is shared out to the gaps.
    const n = col.length || 1;
    const leftover = tileH - y;
    const extra = Math.min(leftover / n, MAX_FILL_EXTRA);
    const gapExtra = (leftover - extra * n) / n;

    let cy = 0;
    const placed: typeof prevCol = [];
    for (let i = 0; i < col.length; i++) {
      const h = col[i].h + extra;
      cells.push({
        key: `c${c}-${i}-${col[i].img.id}`,
        img: col[i].img,
        x: c * COL_PITCH,
        y: cy,
        h,
      });
      placed.push({ id: col[i].img.id, top: cy, bottom: cy + h });
      cy += h + GAP + gapExtra;
    }
    prevCol = placed;
  }

  return { cells, tileH };
};

export default function GalleryPage() {
  const { width: winW, height: winH } = useWindowDimensions();
  const viewW = winW || 1280;
  const viewH = winH || 800;

  const [images, setImages]                 = useState<GalleryImage[]>([]);
  const [categories, setCategories]         = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [ready, setReady]                   = useState(false);
  const [lightboxImg, setLightboxImg]       = useState<GalleryImage | null>(null);
  const [fullLoaded, setFullLoaded]         = useState(false);

  // ─── DOM refs (web) ───────────────────────────────────────────────────────
  const containerRef = useRef<any>(null);
  const canvasRef    = useRef<any>(null);

  // ─── Camera state (refs → no re-renders during animation) ────────────────
  const panRef      = useRef({ x: 0, y: 0 });
  const scaleRef    = useRef(DEFAULT_SCALE);
  const tileHRef    = useRef(viewH);
  const viewRef     = useRef({ w: viewW, h: viewH });
  const minScaleRef = useRef(SCALE_FLOOR);

  // ─── Drag / gesture tracking ──────────────────────────────────────────────
  const draggingRef = useRef(false);
  const prevPosRef  = useRef({ x: 0, y: 0 });
  const prevTimeRef = useRef(0);
  const velRef      = useRef({ x: 0, y: 0 });
  const dragDistRef = useRef(0);           // click-vs-drag detection
  const pinchRef    = useRef<{ dist: number; x: number; y: number } | null>(null);
  const rafRef      = useRef<number | null>(null);
  const frameRef    = useRef<number | null>(null);

  // ─── Native animated values (web writes the DOM directly instead) ─────────
  const nativeTX = useRef(new Animated.Value(0)).current;
  const nativeTY = useRef(new Animated.Value(0)).current;
  const nativeS  = useRef(new Animated.Value(DEFAULT_SCALE)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const lightFade = useRef(new Animated.Value(0)).current;

  // A stable seed keeps the shuffle identical across resizes / re-renders,
  // so the wall only reshuffles when the pictures themselves change.
  const seedRef = useRef(Math.floor(Math.random() * 1e9));

  useEffect(() => { viewRef.current = { w: viewW, h: viewH }; }, [viewW, viewH]);

  // ─── Layout ───────────────────────────────────────────────────────────────
  const { cells, tileH } = useMemo(() => {
    const filtered = activeCategory
      ? images.filter(i => i.category === activeCategory)
      : images;
    let seed = seedRef.current;
    for (let i = 0; i < (activeCategory ?? '').length; i++) {
      seed = (seed * 31 + (activeCategory as string).charCodeAt(i)) | 0;
    }
    return buildTile(filtered, viewH, seed);
  }, [images, activeCategory, viewH]);

  // Smallest zoom that still keeps the super-tile covering the screen — below
  // this the wrap seams would become visible at the edges. The camera can sit
  // anywhere inside one period, so only (tiles - 1) periods are guaranteed.
  const minScale = useMemo(() => clamp(
    Math.max(
      viewW / ((MAX_TILES - 1) * TILE_W),
      viewH / ((MAX_TILES - 1) * tileH),
    ) * 1.02,
    SCALE_FLOOR,
    DEFAULT_SCALE,
  ), [viewW, viewH, tileH]);

  useEffect(() => { tileHRef.current = tileH; }, [tileH]);
  useEffect(() => { minScaleRef.current = minScale; }, [minScale]);

  // ─── Core: push the camera to the canvas ──────────────────────────────────
  //
  //  Camera model:
  //    panRef.x/y = unbounded virtual position
  //    effective dx = posmod(panX, TILE_W * scale) - TILE_W * scale ∈ (-TILE_W*s, 0]
  //    screen_x of canvas_point P = P * scale + dx
  //
  //  Because we render TILES_X×TILES_Y copies of the period, the modulo wrap is
  //  invisible: the camera never reaches an edge of the rendered canvas.
  //
  const applyTransform = useCallback(() => {
    const s  = scaleRef.current;
    const sW = TILE_W * s;
    const sH = tileHRef.current * s;
    const dx = posmod(panRef.current.x, sW) - sW;
    const dy = posmod(panRef.current.y, sH) - sH;
    if (Platform.OS === 'web') {
      if (!canvasRef.current) return;
      canvasRef.current.style.transform       = `translate3d(${dx}px,${dy}px,0) scale(${s})`;
      canvasRef.current.style.transformOrigin = '0 0';
    } else {
      nativeTX.setValue(dx);
      nativeTY.setValue(dy);
      nativeS.setValue(s);
    }
  }, [nativeTX, nativeTY, nativeS]);

  /** Coalesce input-driven writes into one per animation frame. */
  const scheduleTransform = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      applyTransform();
    });
  }, [applyTransform]);

  const cancelAnim = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // ─── Zoom at a screen pivot (keeps the canvas point under pivot fixed) ────
  const zoomAtPoint = useCallback((newS: number, pivotX: number, pivotY: number) => {
    newS = clamp(newS, minScaleRef.current, MAX_SCALE);
    const s  = scaleRef.current;
    const sW = TILE_W * s;
    const sH = tileHRef.current * s;
    const dx = posmod(panRef.current.x, sW) - sW;
    const dy = posmod(panRef.current.y, sH) - sH;
    const cpX = (pivotX - dx) / s;   // canvas point under the pivot
    const cpY = (pivotY - dy) / s;
    scaleRef.current = newS;
    panRef.current.x = (pivotX - cpX * newS) + TILE_W * newS;
    panRef.current.y = (pivotY - cpY * newS) + tileHRef.current * newS;
  }, []);

  // ─── Eased zoom towards a pivot ───────────────────────────────────────────
  const animateZoom = useCallback((targetS: number, pivotX: number, pivotY: number, dur = 340) => {
    cancelAnim();
    const s0 = scaleRef.current;
    const sT = clamp(targetS, minScaleRef.current, MAX_SCALE);
    const sW = TILE_W * s0;
    const sH = tileHRef.current * s0;
    const dx = posmod(panRef.current.x, sW) - sW;
    const dy = posmod(panRef.current.y, sH) - sH;
    const cpX = (pivotX - dx) / s0;
    const cpY = (pivotY - dy) / s0;
    const t0 = nowMs();
    const tick = () => {
      const t = Math.min((nowMs() - t0) / dur, 1);
      const s = s0 + (sT - s0) * easeOut3(t);
      scaleRef.current = s;
      panRef.current.x = (pivotX - cpX * s) + TILE_W * s;
      panRef.current.y = (pivotY - cpY * s) + tileHRef.current * s;
      applyTransform();
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform, cancelAnim]);

  const handleZoom = useCallback((zoomIn: boolean) => {
    const { w, h } = viewRef.current;
    const factor = zoomIn ? 1.35 : 1 / 1.35;
    animateZoom(scaleRef.current * factor, w / 2, h / 2, 300);
  }, [animateZoom]);

  // ─── Recenter / reset ─────────────────────────────────────────────────────
  //  panX places canvas point (TILE_W/2, tileH/2) at the screen centre:
  //    TILE_W/2 * s + (panX - TILE_W*s) = viewW/2  →  panX = viewW/2 + TILE_W*s/2
  const targetCenterPan = useCallback((s: number) => ({
    x: viewRef.current.w / 2 + TILE_W * s / 2,
    y: viewRef.current.h / 2 + tileHRef.current * s / 2,
  }), []);

  const animateHome = useCallback((dur = 420) => {
    cancelAnim();
    velRef.current = { x: 0, y: 0 };
    const targetS = clamp(DEFAULT_SCALE, minScaleRef.current, MAX_SCALE);
    const startX = panRef.current.x;
    const startY = panRef.current.y;
    const startS = scaleRef.current;
    const { x: tx, y: ty } = targetCenterPan(targetS);
    const t0 = nowMs();
    const tick = () => {
      const t = Math.min((nowMs() - t0) / dur, 1);
      const e = easeOut3(t);
      panRef.current.x = startX + (tx - startX) * e;
      panRef.current.y = startY + (ty - startY) * e;
      scaleRef.current = startS + (targetS - startS) * e;
      applyTransform();
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform, cancelAnim, targetCenterPan]);

  // ─── Inertia (frame-rate independent) ─────────────────────────────────────
  const inertiaLoop = useCallback(() => {
    let last = nowMs();
    const tick = () => {
      if (draggingRef.current) { rafRef.current = null; return; }
      const t = nowMs();
      const dt = Math.min(t - last, 64) / 16.667; // in 60fps frames
      last = t;
      const k = Math.pow(DECEL, dt);
      velRef.current.x *= k;
      velRef.current.y *= k;
      panRef.current.x += velRef.current.x * dt;
      panRef.current.y += velRef.current.y * dt;
      applyTransform();
      if (Math.abs(velRef.current.x) > STOP_V || Math.abs(velRef.current.y) > STOP_V) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    cancelAnim();
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform, cancelAnim]);

  // ─── Drag callbacks ───────────────────────────────────────────────────────
  const onDragStart = useCallback((x: number, y: number) => {
    cancelAnim();
    draggingRef.current = true;
    prevPosRef.current  = { x, y };
    prevTimeRef.current = nowMs();
    velRef.current      = { x: 0, y: 0 };
    dragDistRef.current = 0;
  }, [cancelAnim]);

  const onDragMove = useCallback((x: number, y: number) => {
    if (!draggingRef.current) return;
    const t  = nowMs();
    const dt = Math.max(t - prevTimeRef.current, 1);
    const dx = x - prevPosRef.current.x;
    const dy = y - prevPosRef.current.y;

    panRef.current.x    += dx;
    panRef.current.y    += dy;
    dragDistRef.current += Math.abs(dx) + Math.abs(dy);

    // Exponential moving average velocity (px / 60fps frame)
    const alpha = clamp(dt / 16.667, 0, 1);
    velRef.current.x = clamp(velRef.current.x * (1 - alpha) + (dx / dt * 16.667) * alpha, -MAX_V, MAX_V);
    velRef.current.y = clamp(velRef.current.y * (1 - alpha) + (dy / dt * 16.667) * alpha, -MAX_V, MAX_V);

    prevPosRef.current  = { x, y };
    prevTimeRef.current = t;
    scheduleTransform();
  }, [scheduleTransform]);

  const onDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Stale flick (finger rested before lifting) shouldn't launch the canvas.
    if (nowMs() - prevTimeRef.current > 90) velRef.current = { x: 0, y: 0 };
    inertiaLoop();
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
      if (!document.getElementById('gallery-canvas-style')) {
        // react-native-web drops `className`, so the hooks below are data-*
        // attributes fed through the `dataSet` prop.
        const s = document.createElement('style');
        s.id = 'gallery-canvas-style';
        s.textContent = `
[data-gallery="canvas"]{cursor:grab;user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
[data-gallery="canvas"]:active{cursor:grabbing}
[data-gallery="canvas"] *{user-select:none;-webkit-user-drag:none}
[data-gallery="surface"]{will-change:transform;backface-visibility:hidden}
[data-gallery="cell"]{transition:transform .5s cubic-bezier(.16,.84,.44,1),filter .5s ease,box-shadow .5s ease;filter:brightness(.82) saturate(.94)}
[data-gallery="cell"] img{transition:transform .8s cubic-bezier(.16,.84,.44,1)}
[data-gallery="canvas"]:not(:active) [data-gallery="cell"]:hover{transform:scale(1.04);filter:brightness(1.06) saturate(1.04);box-shadow:0 22px 48px rgba(0,0,0,.6);z-index:3}
[data-gallery="canvas"]:not(:active) [data-gallery="cell"]:hover img{transform:scale(1.06)}
[data-gallery="full"]{transition:opacity .35s ease}
@media (prefers-reduced-motion:reduce){[data-gallery="cell"],[data-gallery="cell"] img{transition:none}}
`;
        document.head.appendChild(s);
      }
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // ─── Place the camera on load, and glide home on category / size change ───
  const firstPlacedRef = useRef(false);
  useEffect(() => {
    if (!ready || cells.length === 0) return;
    tileHRef.current = tileH;

    if (!firstPlacedRef.current) {
      firstPlacedRef.current = true;
      const s = clamp(DEFAULT_SCALE, minScaleRef.current, MAX_SCALE);
      scaleRef.current = s;
      panRef.current = targetCenterPan(s);
      // Let the tiles mount, then reveal the wall.
      const id = setTimeout(() => {
        applyTransform();
        Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }).start();
      }, 40);
      return () => clearTimeout(id);
    }
    animateHome();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeCategory, tileH, viewW]);

  // ─── Web input ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return;
    const el = containerRef.current;
    if (!el) return;

    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) onDragStart(e.clientX, e.clientY); };
    const onMouseMove = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
    const onMouseUp   = () => onDragEnd();

    const onDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      const zoomedIn = scaleRef.current > DEFAULT_SCALE * 1.2;
      animateZoom(zoomedIn ? DEFAULT_SCALE : DEFAULT_SCALE * 1.9, e.clientX, e.clientY, 420);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        pinchRef.current = null;
        onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        draggingRef.current = false;
        cancelAnim();
        velRef.current = { x: 0, y: 0 };
        pinchRef.current = {
          dist: dist(e.touches[0], e.touches[1]),
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d  = dist(e.touches[0], e.touches[1]);
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const prev = pinchRef.current;
        // Pan by the midpoint drift, then zoom around it.
        panRef.current.x += mx - prev.x;
        panRef.current.y += my - prev.y;
        if (prev.dist > 0) zoomAtPoint(scaleRef.current * (d / prev.dist), mx, my);
        pinchRef.current = { dist: d, x: mx, y: my };
        scheduleTransform();
      } else if (e.touches.length === 1 && draggingRef.current) {
        e.preventDefault();
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) { pinchRef.current = null; onDragEnd(); }
      else if (e.touches.length === 1) {
        pinchRef.current = null;
        onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnim();
      // deltaMode 1 = lines, 2 = pages
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewRef.current.h : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        zoomAtPoint(scaleRef.current * Math.exp(-dy * 0.0025), e.clientX, e.clientY);
      } else {
        panRef.current.x -= dx * 1.15;
        panRef.current.y -= dy * 1.15;
      }
      scheduleTransform();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLightboxImg(cur => {
        if (cur) DeviceEventEmitter.emit('lightboxOpen', false);
        return null;
      });
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ready, onDragStart, onDragMove, onDragEnd, zoomAtPoint, animateZoom, scheduleTransform, cancelAnim]);

  // ─── Native drag (same camera model, Animated instead of DOM) ─────────────
  const nativePR = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => onDragStart(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderMove:  (e) => onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderRelease: () => onDragEnd(),
    onPanResponderTerminate: () => onDragEnd(),
  })).current;

  // ─── Lightbox ─────────────────────────────────────────────────────────────
  const openLightbox = useCallback((img: GalleryImage) => {
    setFullLoaded(false);
    setLightboxImg(img);
    DeviceEventEmitter.emit('lightboxOpen', true);
    lightFade.setValue(0);
    Animated.timing(lightFade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [lightFade]);

  const closeLightbox = useCallback(() => {
    DeviceEventEmitter.emit('lightboxOpen', false);
    Animated.timing(lightFade, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' })
      .start(() => setLightboxImg(null));
  }, [lightFade]);

  // ─── Tile offsets ─────────────────────────────────────────────────────────
  // Only as many copies as the screen can actually reveal at full zoom-out —
  // a tall wall (lots of photos) needs fewer of them, which keeps the node
  // count down. `+ 1` covers the camera sitting mid-period.
  const { tiles, tilesX, tilesY } = useMemo(() => {
    const tx = clamp(Math.ceil(viewW / (TILE_W * minScale)) + 1, 2, MAX_TILES);
    const ty = clamp(Math.ceil(viewH / (tileH  * minScale)) + 1, 2, MAX_TILES);
    const arr: { tx: number; ty: number }[] = [];
    for (let r = 0; r < ty; r++) for (let c = 0; c < tx; c++) arr.push({ tx: c, ty: r });
    return { tiles: arr, tilesX: tx, tilesY: ty };
  }, [viewW, viewH, tileH, minScale]);

  // Rendered in both branches below: `ready` is false during static rendering,
  // so putting this only in the main return would ship a titleless HTML file.
  const seo = (
    <Seo
      path="/gallery"
      title="גלריית תמונות מאירועים"
      description="גלריית תמונות מאירועים שליווינו: עמדות צילום AI, מגנטים מעוצבים וצילומי סטילס מחתונות, בר/בת מצווה ואירועי חברה. הציצו לתוצאות האמיתיות."
      image="/emda/e1.jpeg"
      breadcrumb={[{ name: 'גלריה', path: '/gallery' }]}
    />
  );

  if (!ready) return <>{seo}<View style={styles.container} /></>;

  const canvasTransform = Platform.OS === 'web' ? null : {
    transform: [{ translateX: nativeTX }, { translateY: nativeTY }, { scale: nativeS }],
    transformOrigin: '0 0',
  } as any;

  return (
    <>
      {seo}
      <View style={styles.container}>

        {/* ── Draggable infinite canvas ── */}
        <View
          ref={containerRef}
          style={styles.canvasContainer}
          {...(Platform.OS === 'web' ? { dataSet: { gallery: 'canvas' } } : {})}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]} pointerEvents="box-none">
            <Animated.View
              ref={canvasRef}
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width:  TILE_W * tilesX,
                  height: tileH  * tilesY,
                },
                canvasTransform,
              ]}
              {...(Platform.OS === 'web' ? { dataSet: { gallery: 'surface' } } : nativePR.panHandlers)}
            >
              {tiles.map(({ tx, ty }) =>
                cells.map(cell => (
                  <View
                    key={`${cell.key}-${tx}-${ty}`}
                    style={{
                      position: 'absolute',
                      left:   tx * TILE_W + cell.x,
                      top:    ty * tileH  + cell.y,
                      width:  IMG_WIDTH,
                      height: cell.h,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                    {...(Platform.OS === 'web' ? { dataSet: { gallery: 'cell' } } : {})}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.cellTouch}
                      onPress={() => {
                        if (dragDistRef.current > 10) return; // was a drag, not a click
                        openLightbox(cell.img);
                      }}
                    >
                      <Image source={{ uri: cell.img.uri }} style={styles.gridImage} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </Animated.View>
          </Animated.View>
        </View>

        {/* ── Empty state ── */}
        {cells.length === 0 && (
          <View style={styles.emptyWrap} pointerEvents="none">
            <Feather name="image" size={34} color="rgba(255,255,255,0.35)" />
            <Text style={styles.emptyText}>אין עדיין תמונות בקטגוריה הזו</Text>
          </View>
        )}

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
          <TouchableOpacity style={[styles.controlBtn, { marginTop: 12 }]} onPress={() => animateHome()}>
            <FontAwesome name="crosshairs" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Lightbox ── */}
        {lightboxImg && (
          <Animated.View
            style={[styles.lightboxOverlay, {
              opacity: lightFade,
              transform: [{ scale: lightFade.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }],
            }]}
          >
            <TouchableOpacity style={styles.lightboxBackdrop} activeOpacity={1} onPress={closeLightbox} />
            {/* The already-cached thumbnail shows instantly; the full-resolution
                copy fades over it the moment it arrives. */}
            <View style={styles.lightboxStage}>
              <Image
                source={{ uri: lightboxImg.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
              {!!lightboxImg.fullUri && (
                <Image
                  source={{ uri: lightboxImg.fullUri }}
                  style={[StyleSheet.absoluteFill, { opacity: fullLoaded ? 1 : 0 }]}
                  resizeMode="contain"
                  onLoad={() => setFullLoaded(true)}
                  {...(Platform.OS === 'web' ? { dataSet: { gallery: 'full' } } : {})}
                />
              )}
            </View>
            <TouchableOpacity style={styles.lightboxClose} onPress={closeLightbox}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}

      </View>
    </>
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
  cellTouch: {
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  emptyWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
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
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
  lightboxStage: {
    width: '92%',
    height: '88%',
    pointerEvents: 'none',
  },
});

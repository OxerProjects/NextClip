import { Colors } from '@/constants/theme';
import { GalleryImage, getGalleryImages, GRID_TOTAL_WIDTH } from '@/utils/storage';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, DeviceEventEmitter, Dimensions, Image, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMG_WIDTH = 300;
const GAP = 12;
const DEFAULT_SCALE = 1.2;
const TILE_COUNT = 3;

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<GalleryImage | null>(null);

  const openLightbox = (img: GalleryImage) => {
    setSelectedLightboxImage(img);
    DeviceEventEmitter.emit('lightboxOpen', true);
  };

  const closeLightbox = () => {
    setSelectedLightboxImage(null);
    DeviceEventEmitter.emit('lightboxOpen', false);
  };

  // Refs for high-performance direct DOM manipulation on Web
  const containerRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const gridHeightRef = useRef(0);

  // Track coordinates in refs to completely avoid React state updates during movement
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(DEFAULT_SCALE);
  const centerOffset = useRef({ x: 0, y: 0 });
  
  // Dragging and inertia physics refs
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Fallbacks for React Native Mobile
  const mobilePan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const mobileScale = useRef(new Animated.Value(DEFAULT_SCALE)).current;

  // 1. Dynamic masonry packing algorithm per category
  const { packedList, dynamicHeights, maxGridHeight } = useMemo(() => {
    const filtered = activeCategory
      ? images.filter(img => img.category === activeCategory)
      : images;

    const heights = new Array(8).fill(0); // 8 columns

    const packed = filtered.map(img => {
      // Find the shortest column to place the next image
      let minCol = 0;
      for (let c = 1; c < 8; c++) {
        if (heights[c] < heights[minCol]) {
          minCol = c;
        }
      }

      const top = heights[minCol];
      heights[minCol] += img.height + GAP;

      return {
        ...img,
        col: minCol,
        row_y: top,
      };
    });

    const maxHeight = Math.max(...heights, 400); // minimum fallback height
    gridHeightRef.current = maxHeight;

    return {
      packedList: packed,
      dynamicHeights: heights,
      maxGridHeight: maxHeight,
    };
  }, [images, activeCategory]);

  useEffect(() => {
    loadImages();
    
    // Inject grab cursor styles
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('gallery-cursor-style')) {
        const style = document.createElement('style');
        style.id = 'gallery-cursor-style';
        style.textContent = `
          .gallery-canvas,
          .gallery-canvas * { cursor: grab !important; user-select: none !important; }
          .gallery-canvas:active,
          .gallery-canvas:active * { cursor: grabbing !important; }
        `;
        document.head.appendChild(style);
      }
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const loadImages = async () => {
    const data = await getGalleryImages();
    setImages(data);
    const uniqueCats = Array.from(new Set(data.map(img => img.category)));
    setCategories(uniqueCats);

    const offsetX = (SCREEN_W - GRID_TOTAL_WIDTH * DEFAULT_SCALE) / 2;
    const offsetY = (SCREEN_H - maxGridHeight * DEFAULT_SCALE) / 2;
    centerOffset.current = { x: offsetX, y: offsetY };

    panRef.current = { x: offsetX, y: offsetY };
    mobilePan.setValue({ x: offsetX, y: offsetY });
    
    setReady(true);

    // Initial draw
    setTimeout(updateCanvasTransform, 50);
  };

  // Direct GPU-accelerated style update helper
  const updateCanvasTransform = () => {
    if (Platform.OS === 'web') {
      if (canvasRef.current) {
        const tx = panRef.current.x - (GRID_TOTAL_WIDTH + GAP);
        const ty = panRef.current.y - (gridHeightRef.current + GAP);
        canvasRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0px) scale(${scaleRef.current})`;
        canvasRef.current.style.transformOrigin = 'top left';
      }
    } else {
      // Mobile fallback
      mobilePan.setValue(panRef.current);
      mobileScale.setValue(scaleRef.current);
    }
  };

  // Hysteresis wrapping equation to seamlessly loop the canvas without jumps
  const wrapCoordinates = () => {
    const W = GRID_TOTAL_WIDTH + GAP;
    const H = gridHeightRef.current + GAP;
    const centerX = centerOffset.current.x;
    const centerY = centerOffset.current.y;

    const thresholdX = W * 0.8;
    if (panRef.current.x < centerX - thresholdX) {
      panRef.current.x += W;
      dragStartRef.current.x += W;
    } else if (panRef.current.x > centerX + thresholdX) {
      panRef.current.x -= W;
      dragStartRef.current.x -= W;
    }

    const thresholdY = H * 0.8;
    if (panRef.current.y < centerY - thresholdY) {
      panRef.current.y += H;
      dragStartRef.current.y += H;
    } else if (panRef.current.y > centerY + thresholdY) {
      panRef.current.y -= H;
      dragStartRef.current.y -= H;
    }
  };

  // Web requestAnimationFrame Inertia Deceleration loop
  const animateInertia = () => {
    if (isDraggingRef.current) return;

    // Deceleration factor of 0.985 offers smooth physical slide
    velocityRef.current.x *= 0.985;
    velocityRef.current.y *= 0.985;

    panRef.current.x += velocityRef.current.x;
    panRef.current.y += velocityRef.current.y;

    wrapCoordinates();
    updateCanvasTransform();

    if (Math.abs(velocityRef.current.x) > 0.05 || Math.abs(velocityRef.current.y) > 0.05) {
      rafIdRef.current = requestAnimationFrame(animateInertia);
    }
  };

  // Wheel handling (mouse wheel zoom/pan)
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return;
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      if (e.ctrlKey || e.metaKey) {
        let s = scaleRef.current - e.deltaY * 0.003;
        scaleRef.current = Math.max(0.15, Math.min(s, 3));
      } else {
        panRef.current.x -= e.deltaX * 1.5;
        panRef.current.y -= e.deltaY * 1.5;
        wrapCoordinates();
      }
      updateCanvasTransform();
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [ready, packedList]);

  // Web Touch / Mouse Drag handlers
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return;
    const element = containerRef.current;
    if (!element) return;

    const onMouseDown = (e: MouseEvent) => {
      handleDragStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleDragEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handleDragEnd();
    };

    element.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [ready, packedList]);

  // Smoothly recenter when active category changes
  useEffect(() => {
    if (!ready) return;
    const s = scaleRef.current;
    const offsetX = (SCREEN_W - GRID_TOTAL_WIDTH * s) / 2;
    const offsetY = (SCREEN_H - maxGridHeight * s) / 2;
    centerOffset.current = { x: offsetX, y: offsetY };
    
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const startX = panRef.current.x;
    const startY = panRef.current.y;
    const duration = 250;
    const startTime = performance.now();

    const animateRecenter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      panRef.current.x = startX + (offsetX - startX) * ease;
      panRef.current.y = startY + (offsetY - startY) * ease;

      wrapCoordinates();
      updateCanvasTransform();

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animateRecenter);
      }
    };
    rafIdRef.current = requestAnimationFrame(animateRecenter);
  }, [activeCategory, maxGridHeight]);

  const handleDragStart = (clientX: number, clientY: number) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    isDraggingRef.current = true;
    
    velocityRef.current = { x: 0, y: 0 };
    lastTimeRef.current = performance.now();

    touchStartRef.current = { x: clientX, y: clientY };
    dragStartRef.current = { ...panRef.current };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current.x = (dx - (panRef.current.x - dragStartRef.current.x)) / dt * 16;
      velocityRef.current.y = (dy - (panRef.current.y - dragStartRef.current.y)) / dt * 16;
    }
    lastTimeRef.current = now;

    panRef.current.x = dragStartRef.current.x + dx;
    panRef.current.y = dragStartRef.current.y + dy;

    wrapCoordinates();
    updateCanvasTransform();
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    rafIdRef.current = requestAnimationFrame(animateInertia);
  };

  const handleRecenter = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const s = DEFAULT_SCALE;
    const offsetX = (SCREEN_W - GRID_TOTAL_WIDTH * s) / 2;
    const offsetY = (SCREEN_H - maxGridHeight * s) / 2;
    centerOffset.current = { x: offsetX, y: offsetY };

    const startX = panRef.current.x;
    const startY = panRef.current.y;
    const startScale = scaleRef.current;
    const duration = 300;
    const startTime = performance.now();

    const animateRecenter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      panRef.current.x = startX + (offsetX - startX) * ease;
      panRef.current.y = startY + (offsetY - startY) * ease;
      scaleRef.current = startScale + (s - startScale) * ease;

      wrapCoordinates();
      updateCanvasTransform();

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animateRecenter);
      }
    };
    rafIdRef.current = requestAnimationFrame(animateRecenter);
  };

  const handleZoom = (zoomIn: boolean) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const targetScale = Math.max(0.15, Math.min(scaleRef.current + (zoomIn ? 0.25 : -0.25), 3));
    
    const startScale = scaleRef.current;
    const duration = 200;
    const startTime = performance.now();

    const animateScale = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      scaleRef.current = startScale + (targetScale - startScale) * ease;
      updateCanvasTransform();

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animateScale);
      }
    };
    rafIdRef.current = requestAnimationFrame(animateScale);
  };

  // Mobile PanResponder configuration
  const mobilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: mobilePan.x, dy: mobilePan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
      },
    }),
  ).current;

  const tiles = useMemo(() => {
    const arr: { tx: number; ty: number }[] = [];
    for (let ty = -1; ty <= 1; ty++) {
      for (let tx = -1; tx <= 1; tx++) {
        arr.push({ tx, ty });
      }
    }
    return arr;
  }, []);

  if (!ready) {
    return <View style={styles.container} />;
  }

  const animatedViewStyle = Platform.OS === 'web'
    ? {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: GRID_TOTAL_WIDTH * TILE_COUNT,
        height: maxGridHeight * TILE_COUNT,
        willChange: 'transform',
      }
    : {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: GRID_TOTAL_WIDTH * TILE_COUNT,
        height: maxGridHeight * TILE_COUNT,
        transform: [
          { translateX: Animated.add(mobilePan.x, -(GRID_TOTAL_WIDTH + GAP)) },
          { translateY: Animated.add(mobilePan.y, -(maxGridHeight + GAP)) },
          { scale: mobileScale },
        ],
        transformOrigin: 'top left',
      };

  return (
    <View style={styles.container}>
      {/* Draggable canvas area */}
      <View
        ref={containerRef}
        style={styles.canvasContainer}
        {...(Platform.OS === 'web' ? { className: 'gallery-canvas' } : {})}
      >
        <Animated.View
          ref={canvasRef}
          {...(Platform.OS !== 'web' ? mobilePanResponder.panHandlers : {})}
          style={animatedViewStyle}
        >
          {tiles.map(({ tx, ty }, tileIdx) => (
            <View
              key={`tile-${tileIdx}`}
              style={{
                position: 'absolute',
                left: (tx + 1) * (GRID_TOTAL_WIDTH + GAP),
                top: (ty + 1) * (maxGridHeight + GAP),
                width: GRID_TOTAL_WIDTH,
                height: maxGridHeight,
              }}
            >
              {packedList.map(img => {
                const left = img.col * (IMG_WIDTH + GAP);
                const colH = dynamicHeights[img.col] || maxGridHeight;
                const top = img.row_y + ty * (colH - maxGridHeight);
                return (
                  <TouchableOpacity
                    key={`${img.id}-${tileIdx}`}
                    activeOpacity={0.9}
                    onPress={() => {
                      // Prevent click if we were dragging fast
                      if (Math.abs(velocityRef.current.x) > 1 || Math.abs(velocityRef.current.y) > 1) return;
                      openLightbox(img);
                    }}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: img.width,
                      height: img.height,
                    }}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Top gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Title (right) + Filters (left) */}
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

      {/* Zoom & recenter controls */}
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

      {/* Lightbox Modal */}
      {selectedLightboxImage && (
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity 
            style={styles.lightboxClose} 
            onPress={closeLightbox}
          >
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Image 
            source={{ uri: selectedLightboxImage.uri }} 
            style={styles.lightboxImage} 
            resizeMode="contain" 
          />
        </View>
      )}

    </View>
  );
}

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
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  topOverlay: {
    position: 'absolute',
    top: 100,
    left: 40,
    right: 40,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterBtnActive: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
  },
  filterTextActive: {
    color: Colors.dark.background,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dashboardBtn: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  lightboxOverlay: {
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '90%',
    height: '90%',
  },
});

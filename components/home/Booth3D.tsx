import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * Inline 3D model for the hero section.
 */

// =========================================================================
// === הגדרות שלב 1: התחלה (זום אין ממוקד בראש העמדה) ===
// =========================================================================
const START_THETA = 62;        // זווית ימינה/שמאלה
const START_PHI = 75;          // זווית למעלה/למטה
const START_RADIUS = 5;        // מרחק המצלמה בהתחלה (זום)
const START_TARGET_Y = 11.9;   // גובה הפוקוס בהתחלה (11.9 זה למעלה)
const START_FOV = 8;           // עדשת הזום ההתחלתית (מספר קטן = יותר זום)

// =========================================================================
// === הגדרות סוף שלב 1 / תחילת שלב 2 (זום אוט מלא לכל העמדה) ===
// =========================================================================
const END_THETA = 95;          // זווית ימינה/שמאלה בסוף הגלילה (שנה כדי לסובב את המודל!)
const END_PHI = 75;            // זווית למעלה/למטה בסוף
const END_FOV = 45;            // זום אוט עצבני
const END_TARGET_Y = 5.0;      // פוקוס יורד לאמצע
const END_RADIUS = 7.5;        // מצלמה הולכת אחורה

// =========================================================================
// === הגדרות שלב 2: זום אין מותאם אישית (כאן אתה יכול לשחק חופשי!) ===
// =========================================================================
// שנה את הערכים הבאים כדי לקבוע בדיוק לאן המצלמה תתקרב כשהיתרונות עולים:
const STAGE2_THETA = 90;       // זווית סיבוב ימינה/שמאלה (במעלות)
const STAGE2_PHI = 90;         // זווית גובה המצלמה למעלה/למטה (במעלות)
const STAGE2_FOV = 2.2;         // גודל הזום (מספר קטן יותר = זום מקורב יותר, מספר גדול = זום רחוק)
const STAGE2_TARGET_Y = 12.2;   // גובה פוקוס המצלמה (ערך גבוה כמו 10-12 יתמקד בראש העץ, נמוך כמו 4-6 יתמקד ברגליים)
const STAGE2_RADIUS = 6.0;     // מרחק פיזי של המצלמה מהמודל (במטרים)
// =========================================================================

import { runOnJS, SharedValue, useAnimatedReaction } from 'react-native-reanimated';

export function Booth3DInline({ scrollY }: { scrollY?: SharedValue<number> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Load the model-viewer script (one-time)
    if (!document.querySelector('script[data-model-viewer]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      script.setAttribute('data-model-viewer', 'true');
      document.head.appendChild(script);
    }

    const el = containerRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      el.innerHTML = `
        <model-viewer
          id="booth-model"
          src="/test.glb?v=${Date.now()}"
          alt="NextClip Photo Booth"
          camera-orbit="${START_THETA}deg ${START_PHI}deg ${START_RADIUS}m"
          camera-target="0m ${START_TARGET_Y}m 0m"
          field-of-view="${START_FOV}deg"
          min-camera-orbit="auto auto auto"
          max-camera-orbit="auto auto auto"
          min-field-of-view="${START_FOV}deg"
          max-field-of-view="${START_FOV + 3}deg"
          disable-zoom
          disable-pan
          disable-tap
          interpolation-decay="0"
          interaction-prompt="none"
          style="width:100%; height:100%; background-color: transparent; --poster-color: transparent;"
        ></model-viewer>
      `;
      modelRef.current = el.querySelector('model-viewer');
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Hover parallax: rotate model slightly left/right
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = containerRef.current;
    if (!el) return;

    let currentOrbitX = START_THETA;

    const handleMouseMove = (e: MouseEvent) => {
      // Disable hover effect if user has scrolled
      if (scrollY && scrollY.value > 10) return;

      const mv = modelRef.current;
      if (!mv) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      // Shift theta by max ±5 degrees
      currentOrbitX = START_THETA + x * 10;
      mv.setAttribute('camera-orbit', `${currentOrbitX.toFixed(1)}deg ${START_PHI}deg ${START_RADIUS}m`);
    };

    const handleMouseLeave = () => {
      if (scrollY && scrollY.value > 10) return;

      const mv = modelRef.current;
      if (!mv) return;
      currentOrbitX = START_THETA;
      mv.setAttribute('camera-orbit', `${START_THETA}deg ${START_PHI}deg ${START_RADIUS}m`);
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Scroll-driven multi-stage zoom - ultra smooth Reanimated listener
  useAnimatedReaction(
    () => scrollY?.value || 0,
    (y) => {
      if (Platform.OS !== 'web') return;

      const updateCamera = () => {
        const mv = modelRef.current;
        if (!mv) return;

        // טווחי הגלילה לשני השלבים:
        // שלב 1: 0 עד 1800 פיקסלים (זום אוט מלא לראות את כל העמדה)
        // שלב 2: 1800 עד 3500 פיקסלים (זום אין מותאם אישית שאתה קבעת למעלה)
        const STAGE1_END = 1800;
        const STAGE2_END = 3500;

        let theta, phi, radius, targetY, fov;

        if (y <= STAGE1_END) {
          // שלב 1: אינטרפולציה מההתחלה לסוף שלב 1 (זום אוט)
          const progress = Math.min(Math.max(y / STAGE1_END, 0), 1);
          fov = START_FOV + progress * (END_FOV - START_FOV);
          targetY = START_TARGET_Y + progress * (END_TARGET_Y - START_TARGET_Y);
          radius = START_RADIUS + progress * (END_RADIUS - START_RADIUS);
          theta = START_THETA + progress * (END_THETA - START_THETA);
          phi = START_PHI + progress * (END_PHI - START_PHI);
        } else {
          // שלב 2: אינטרפולציה מסוף שלב 1 לשלב 2 המותאם אישית (זום אין למיקום החדש שלך!)
          const progress = Math.min(Math.max((y - STAGE1_END) / (STAGE2_END - STAGE1_END), 0), 1);
          fov = END_FOV + progress * (STAGE2_FOV - END_FOV);
          targetY = END_TARGET_Y + progress * (STAGE2_TARGET_Y - END_TARGET_Y);
          radius = END_RADIUS + progress * (STAGE2_RADIUS - END_RADIUS);
          theta = END_THETA + progress * (STAGE2_THETA - END_THETA);
          phi = END_PHI + progress * (STAGE2_PHI - END_PHI);
        }

        const minFov = Math.min(START_FOV, STAGE2_FOV);
        const maxFov = Math.max(END_FOV, STAGE2_FOV) + 10;

        mv.setAttribute('min-field-of-view', `${minFov}deg`);
        mv.setAttribute('max-field-of-view', `${maxFov}deg`);
        mv.setAttribute('camera-orbit', `${theta.toFixed(1)}deg ${phi.toFixed(1)}deg ${radius.toFixed(1)}m`);
        mv.setAttribute('camera-target', `0m ${targetY.toFixed(1)}m 0m`);
        mv.setAttribute('field-of-view', `${fov.toFixed(0)}deg`);
      };

      runOnJS(updateCamera)();
    },
    [scrollY]
  );

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%' as any,
    height: '100%' as any,
  },
});

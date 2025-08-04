import { readable } from 'svelte/store';
import { browser } from '$app/environment';

export type IconState = {
  x: number;
  y: number;
  opacity: number;
};

// Enhanced logging utilities for animation phases
const AnimationLogger = {
  phase1: (data: any) => console.log(`🔵 PHASE 1 - Scatter→Gather:`, data),
  phase2: (data: any) => console.log(`🟢 PHASE 2 - Gather→Fade:`, data),
  performance: (data: any) => console.log(`⚡ PERFORMANCE:`, data),
  mobile: (data: any) => console.log(`📱 MOBILE:`, data),
  desktop: (data: any) => console.log(`🖥️  DESKTOP:`, data),
  transition: (data: any) => console.log(`🔄 TRANSITION:`, data),
  complete: (phase: string) => console.log(`✅ ${phase} COMPLETE`)
};

/* -------------------------------------------------
 * 1. Layout presets: DESKTOP
 * -------------------------------------------------*/
const scatterDesktop = [
  { x: 10,  y: 170 },
  { x: 100, y: 170 },
  { x: 480, y: 220 },
  { x: 590, y: 125 },
  { x: 550, y: 260 },
  { x: 30,  y: 200 },
  { x: 140, y: 330 },
  { x: 220, y: 300 },
  { x: 260, y: 400 }
];

const gatherDesktopXBase = 335;
const gatherDesktopYBase = 270;
const gatherDesktopSpacing = 65;

const gatherDesktop = [
  { x: gatherDesktopXBase - gatherDesktopSpacing, y: gatherDesktopYBase - gatherDesktopSpacing },
  { x: gatherDesktopXBase,                        y: gatherDesktopYBase - gatherDesktopSpacing },
  { x: gatherDesktopXBase + gatherDesktopSpacing, y: gatherDesktopYBase - gatherDesktopSpacing },
  { x: gatherDesktopXBase - gatherDesktopSpacing, y: gatherDesktopYBase },
  { x: gatherDesktopXBase,                        y: gatherDesktopYBase },
  { x: gatherDesktopXBase + gatherDesktopSpacing, y: gatherDesktopYBase },
  { x: gatherDesktopXBase - gatherDesktopSpacing, y: gatherDesktopYBase + gatherDesktopSpacing },
  { x: gatherDesktopXBase,                        y: gatherDesktopYBase + gatherDesktopSpacing },
  { x: gatherDesktopXBase + gatherDesktopSpacing, y: gatherDesktopYBase + gatherDesktopSpacing }
];

const gather2DesktopXBase = 335;
const gather2DesktopYBase = 300;

const gather2Desktop = [
  { x: gather2DesktopXBase - 10, y: gather2DesktopYBase - 10 },
  { x: gather2DesktopXBase,      y: gather2DesktopYBase - 10 },
  { x: gather2DesktopXBase + 10, y: gather2DesktopYBase - 10 },
  { x: gather2DesktopXBase - 10, y: gather2DesktopYBase },
  { x: gather2DesktopXBase,      y: gather2DesktopYBase },
  { x: gather2DesktopXBase + 10, y: gather2DesktopYBase },
  { x: gather2DesktopXBase - 10, y: gather2DesktopYBase + 10 },
  { x: gather2DesktopXBase,      y: gather2DesktopYBase + 10 },
  { x: gather2DesktopXBase + 10, y: gather2DesktopYBase + 10 }
];

/* -------------------------------------------------
 * 1a. Layout presets: MOBILE
 * -------------------------------------------------*/
const scatterMobileXBase = 180;
const scatterMobileYBase = 80;

const scatterMobile = [
  { x: scatterMobileXBase + 5,   y: scatterMobileYBase + 110 },
  { x: scatterMobileXBase + 80,  y: scatterMobileYBase + 170 },
  { x: scatterMobileXBase + 220, y: scatterMobileYBase + 185 },
  { x: scatterMobileXBase + 300, y: scatterMobileYBase + 120 },
  { x: scatterMobileXBase + 310, y: scatterMobileYBase + 197 },
  { x: scatterMobileXBase + 10,  y: scatterMobileYBase + 200 },
  { x: scatterMobileXBase + 80,  y: scatterMobileYBase + 290 },
  { x: scatterMobileXBase + 185, y: scatterMobileYBase + 258 },
  { x: scatterMobileXBase + 270, y: scatterMobileYBase + 280 }
];

const gatherMobileXBase = 334;
const gatherMobileYBase = 136;
const gatherMobileSpacing = 51;

const gatherMobile = [
  { x: gatherMobileXBase - gatherMobileSpacing, y: gatherMobileYBase - gatherMobileSpacing },
  { x: gatherMobileXBase,                       y: gatherMobileYBase - gatherMobileSpacing },
  { x: gatherMobileXBase + gatherMobileSpacing, y: gatherMobileYBase - gatherMobileSpacing },
  { x: gatherMobileXBase - gatherMobileSpacing, y: gatherMobileYBase },
  { x: gatherMobileXBase,                       y: gatherMobileYBase },
  { x: gatherMobileXBase + gatherMobileSpacing, y: gatherMobileYBase },
  { x: gatherMobileXBase - gatherMobileSpacing, y: gatherMobileYBase + gatherMobileSpacing },
  { x: gatherMobileXBase,                       y: gatherMobileYBase + gatherMobileSpacing },
  { x: gatherMobileXBase + gatherMobileSpacing, y: gatherMobileYBase + gatherMobileSpacing }
];

const gather2MobileXBase = 334;
const gather2MobileYBase = 200;

const gather2Mobile = [
  { x: gather2MobileXBase - 10, y: gather2MobileYBase - 10 },
  { x: gather2MobileXBase,      y: gather2MobileYBase - 10 },
  { x: gather2MobileXBase + 10, y: gather2MobileYBase - 10 },
  { x: gather2MobileXBase - 10, y: gather2MobileYBase },
  { x: gather2MobileXBase,      y: gather2MobileYBase },
  { x: gather2MobileXBase + 10, y: gather2MobileYBase },
  { x: gather2MobileXBase - 10, y: gather2MobileYBase + 10 },
  { x: gather2MobileXBase,      y: gather2MobileYBase + 10 },
  { x: gather2MobileXBase + 10, y: gather2MobileYBase + 10 }
];

/* -------------------------------------------------
 * 2. Scroll-phase boundaries
 * -------------------------------------------------*/
// Desktop
const scroll1StartDesktop =  50;
const scroll1EndDesktop   = 170;
const scroll2StartDesktop = 300;
const scroll2EndDesktop   = 420;

// Mobile
const scroll1StartMobile =  0;
const scroll1EndMobile   = 300;
const scroll2StartMobile = 400;
const scroll2EndMobile   = 450;

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

/* -------------------------------------------------
 * 3. Readable store emitting icon positions + opacity
 *    based on scroll, with desktop/mobile logic.
 * -------------------------------------------------*/
export const iconPositions = readable<IconState[]>([], (set) => {
  // Return early with default values during SSR
  if (!browser) {
    // Set initial positions to scatter desktop as default
    const initialPositions = scatterDesktop.map(pos => ({
      ...pos,
      opacity: 1
    }));
    set(initialPositions);
    AnimationLogger.transition({ state: 'SSR_INITIALIZATION', positions: initialPositions.length });
    return;
  }

  const isMobile = window.innerWidth < 720;
  const deviceType = isMobile ? 'MOBILE' : 'DESKTOP';
  
  // Log device detection and configuration
  (isMobile ? AnimationLogger.mobile : AnimationLogger.desktop)({
    screenWidth: window.innerWidth,
    deviceType,
    timestamp: new Date().toISOString()
  });

  const scatterActive  = isMobile ? scatterMobile  : scatterDesktop;
  const gatherActive   = isMobile ? gatherMobile   : gatherDesktop;
  const gather2Active  = isMobile ? gather2Mobile  : gather2Desktop;

  const scroll1Start = isMobile ? scroll1StartMobile : scroll1StartDesktop;
  const scroll1End   = isMobile ? scroll1EndMobile   : scroll1EndDesktop;
  const scroll2Start = isMobile ? scroll2StartMobile : scroll2StartDesktop;
  const scroll2End   = isMobile ? scroll2EndMobile   : scroll2EndDesktop;

  // Log scroll boundaries
  AnimationLogger.transition({
    device: deviceType,
    phase1_boundaries: { start: scroll1Start, end: scroll1End },
    phase2_boundaries: { start: scroll2Start, end: scroll2End },
    total_icons: scatterActive.length
  });

  let lastPhase = 'INITIAL';
  let lastLogTime = 0;
  const LOG_THROTTLE_MS = 100; // Prevent spam, log every 100ms max

  function update() {
    const startTime = performance.now();
    const scrollY = window.scrollY;
    let next: IconState[];
    let currentPhase = '';

    if (scrollY <= scroll1End) {
      // PHASE 1: Scatter → Gather Animation
      currentPhase = 'PHASE_1_SCATTER_TO_GATHER';
      const t = clamp((scrollY - scroll1Start) / (scroll1End - scroll1Start), 0, 1);
      const progressPercentage = Math.round(t * 100);
      
      next = scatterActive.map((start, i) => {
        const end = gatherActive[i];
        const newPos = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
          opacity: 1
        };
        return newPos;
      });

      // Throttled logging for Phase 1
      const now = Date.now();
      if (now - lastLogTime > LOG_THROTTLE_MS && (lastPhase !== currentPhase || progressPercentage % 25 === 0)) {
        AnimationLogger.phase1({
          scrollY,
          progress: `${progressPercentage}%`,
          interpolation_t: t.toFixed(3),
          scroll_range: `${scroll1Start} → ${scroll1End}`,
          device: deviceType,
          sample_position: { 
            icon0: next[0], 
            icon4: next[4] // Log center icon
          }
        });
        lastLogTime = now;
      }

      if (progressPercentage === 100 && lastPhase !== currentPhase) {
        AnimationLogger.complete('PHASE 1 - Icons gathered in center formation');
      }

    } else if (scrollY <= scroll2End) {
      // PHASE 2: Gather → Fade Animation  
      currentPhase = 'PHASE_2_GATHER_TO_FADE';
      const t = clamp((scrollY - scroll2Start) / (scroll2End - scroll2Start), 0, 1);
      const progressPercentage = Math.round(t * 100);
      const opacityValue = 1 - t;
      
      next = gatherActive.map((start, i) => {
        const end = gather2Active[i];
        const newPos = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
          opacity: opacityValue
        };
        return newPos;
      });

      // Throttled logging for Phase 2
      const now = Date.now();
      if (now - lastLogTime > LOG_THROTTLE_MS && (lastPhase !== currentPhase || progressPercentage % 25 === 0)) {
        AnimationLogger.phase2({
          scrollY,
          progress: `${progressPercentage}%`,
          interpolation_t: t.toFixed(3),
          opacity: opacityValue.toFixed(3),
          scroll_range: `${scroll2Start} → ${scroll2End}`,
          device: deviceType,
          clustering_progress: progressPercentage > 50 ? 'TIGHT_CLUSTERING' : 'INITIAL_CLUSTERING'
        });
        lastLogTime = now;
      }

      if (progressPercentage === 100 && lastPhase !== currentPhase) {
        AnimationLogger.complete('PHASE 2 - Icons clustered and faded out');
      }

    } else {
      // POST-PHASE 2: Full fade state
      currentPhase = 'POST_PHASE_2_COMPLETE';
      next = gather2Active.map(p => ({ ...p, opacity: 0 }));
      
      if (lastPhase !== currentPhase) {
        AnimationLogger.phase2({
          scrollY,
          state: 'FINAL_FADE_COMPLETE',
          all_icons_opacity: 0,
          device: deviceType
        });
        AnimationLogger.complete('ALL ANIMATION PHASES - Icons fully hidden');
      }
    }

    // Performance monitoring
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime > 5) { // Log if frame takes longer than 5ms
      AnimationLogger.performance({
        execution_time_ms: executionTime.toFixed(2),
        frame_budget_exceeded: executionTime > 16.67, // 60fps budget
        current_phase: currentPhase,
        scroll_position: scrollY
      });
    }

    lastPhase = currentPhase;
    set(next);
  }

  update();
  
  // Log initialization complete
  AnimationLogger.transition({
    state: 'ANIMATION_SYSTEM_INITIALIZED',
    device: deviceType,
    event_listeners_attached: true,
    initial_scroll: window.scrollY
  });
  
  window.addEventListener('scroll', update, { passive: true });
  return () => {
    window.removeEventListener('scroll', update);
    AnimationLogger.transition({
      state: 'ANIMATION_SYSTEM_CLEANUP',
      device: deviceType,
      event_listeners_removed: true
    });
  };
});

import { StateCreator } from 'zustand';
import { CameraSlice, CameraGestureState } from '../../types/camera';
import { GameStore } from '../gameStore';

export type { CameraSlice, CameraGestureState };

/**
 * Calculates dynamic Depth of Field (DOF) tilt-shift parameters specifically tuned
 * for mobile pinch-zoom and rotation.
 * 
 * - Zoomed IN (factor ~0.45): Narrows focus width to ~0.06, boosts bokeh blur to 0.038 for a macro diorama effect.
 * - Zoomed OUT (factor ~2.2): Expands focus width to ~0.36, softens blur to 0.012 for strategic field overview.
 * - During active rotation: Briefly opens focal band to prevent nauseating motion blur.
 */
export function calculateDynamicDOF(zoomFactor: number, isRotating: boolean = false) {
  const clampedZoom = Math.max(0.45, Math.min(2.2, zoomFactor));
  const t = (clampedZoom - 0.45) / (2.2 - 0.45); // 0 (close macro) to 1 (wide overview)

  // Focus Width: 0.06 (macro) -> 0.36 (wide overview)
  let focusWidth = 0.06 + t * 0.30;
  
  // Max Bokeh Blur: 0.038 (dramatic macro) -> 0.012 (subtle backdrop)
  let maxBlur = 0.038 - t * 0.026;

  // Bokeh Power Exponent: 4.0 (macro sparkles) -> 2.2 (soft glow)
  let bokehPower = 4.0 - t * 1.8;

  if (isRotating) {
    focusWidth += 0.08;
    maxBlur *= 0.8;
  }

  return {
    dofFocusWidth: Math.max(0.04, Math.min(0.45, focusWidth)),
    dofMaxBlur: Math.max(0.008, Math.min(0.05, maxBlur)),
    dofBokehPower: Math.max(1.8, Math.min(4.5, bokehPower))
  };
}

const initialGestureState: CameraGestureState = {
  cameraZoomFactor: 1.0,
  cameraAzimuthOffset: 0,
  cameraPitchOffset: 0,
  zoomSensitivity: 1.0,
  rotateSensitivity: 1.0,
  isGestureActive: false,
  gestureType: null,
  lastGestureTime: 0,
  dofFocusWidth: 0.16,
  dofMaxBlur: 0.022,
  dofBokehPower: 3.0
};

export const createCameraSlice: StateCreator<GameStore, [], [], CameraSlice> = (set) => ({
  ...initialGestureState,

  setCameraGestureState: (partial) => {
    set((state) => ({ ...state, ...partial }));
  },

  resetCameraGesture: () => {
    const dof = calculateDynamicDOF(1.0, false);
    set({
      cameraZoomFactor: 1.0,
      cameraAzimuthOffset: 0,
      cameraPitchOffset: 0,
      isGestureActive: false,
      gestureType: null,
      lastGestureTime: Date.now(),
      ...dof
    });
  },

  snapCameraRotation: (direction: 'LEFT' | 'RIGHT') => {
    set((state) => {
      const step = Math.PI / 2; // 90 degrees snap
      const current = state.cameraAzimuthOffset;
      // Snap to nearest 90° angle increment
      let target: number;
      if (direction === 'RIGHT') {
        target = Math.floor(current / step + 0.0001) * step + step;
      } else {
        target = Math.ceil(current / step - 0.0001) * step - step;
      }
      const dof = calculateDynamicDOF(state.cameraZoomFactor, true);

      return {
        cameraAzimuthOffset: target,
        isGestureActive: true,
        gestureType: 'TWO_FINGER_ROTATE',
        lastGestureTime: Date.now(),
        ...dof
      };
    });
  },

  updatePinchZoom: (deltaDist) => {
    set((state) => {
      const zoomSens = state.zoomSensitivity || 1.0;
      // Pinching out (deltaDist > 0) reduces factor (zooming in close)
      // Pinching in (deltaDist < 0) increases factor (zooming out)
      const zoomChange = -deltaDist * 0.0035 * zoomSens;
      const nextZoom = Math.max(0.45, Math.min(2.2, state.cameraZoomFactor + zoomChange));
      const dof = calculateDynamicDOF(nextZoom, state.gestureType === 'TWO_FINGER_ROTATE' || state.gestureType === 'BOTH');

      return {
        cameraZoomFactor: nextZoom,
        isGestureActive: true,
        gestureType: state.gestureType === 'TWO_FINGER_ROTATE' ? 'BOTH' : 'PINCH_ZOOM',
        lastGestureTime: Date.now(),
        ...dof
      };
    });
  },

  updateTwoFingerRotation: (deltaAngle) => {
    set((state) => {
      const rotSens = state.rotateSensitivity || 1.0;
      const angleChange = deltaAngle * 1.25 * rotSens;
      const nextAzimuth = state.cameraAzimuthOffset + angleChange;
      const dof = calculateDynamicDOF(state.cameraZoomFactor, true);

      return {
        cameraAzimuthOffset: nextAzimuth,
        isGestureActive: true,
        gestureType: state.gestureType === 'PINCH_ZOOM' ? 'BOTH' : 'TWO_FINGER_ROTATE',
        lastGestureTime: Date.now(),
        ...dof
      };
    });
  },

  setGestureSensitivity: (zoomSens, rotateSens) => {
    set({
      zoomSensitivity: zoomSens,
      rotateSensitivity: rotateSens
    });
  }
});

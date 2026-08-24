export interface CameraGestureState {
  cameraZoomFactor: number;          // Pinch zoom distance multiplier (0.45 to 2.2, default 1.0)
  cameraAzimuthOffset: number;       // Orbit rotation angle around Y axis (radians)
  cameraPitchOffset: number;         // Orbit pitch angle offset (radians)
  zoomSensitivity: number;           // Touch sensitivity factor for pinch-to-zoom (default 1.0)
  rotateSensitivity: number;         // Touch sensitivity factor for 2-finger rotation (default 1.0)
  isGestureActive: boolean;          // True when user is actively pinching or rotating
  gestureType: 'PINCH_ZOOM' | 'TWO_FINGER_ROTATE' | 'BOTH' | null;
  lastGestureTime: number;           // Timestamp of last gesture interaction for UI HUD fadeout
  
  // Computed Depth of Field (DOF) focus parameters
  dofFocusWidth: number;             // Dynamic focus zone width (0.06 macro to 0.38 overview)
  dofMaxBlur: number;                // Dynamic bokeh max blur radius (0.012 to 0.040)
  dofBokehPower: number;             // Dynamic bokeh pop exponent (2.0 to 4.2)
}

export interface CameraSlice extends CameraGestureState {
  setCameraGestureState: (state: Partial<CameraGestureState>) => void;
  resetCameraGesture: () => void;
  snapCameraRotation: (direction: 'LEFT' | 'RIGHT') => void;
  updatePinchZoom: (deltaDist: number) => void;
  updateTwoFingerRotation: (deltaAngle: number) => void;
  setGestureSensitivity: (zoomSens: number, rotateSens: number) => void;
}

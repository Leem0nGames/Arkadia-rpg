import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';

/**
 * Tactical Camera Gesture Controller
 * 
 * Attaches custom multi-touch gesture handlers to the WebGL canvas viewport:
 * 1. Pinch-to-Zoom: Pinching out zooms in close to tactical units; pinching in pulls back camera.
 *    Dynamically recalibrates Depth-of-Field (DOF) focus and bokeh in real time!
 * 2. Two-Finger Rotation: Rotates camera azimuth smoothly around tactical target point.
 * 3. Mobile Touch Responsiveness & Inertia: Damps velocity to deliver silky smooth 60fps controls.
 */
export const TacticalCameraGestureController: React.FC = () => {
  const { gl } = useThree();
  const {
    updatePinchZoom,
    updateTwoFingerRotation,
    setCameraGestureState
  } = useGameStore();

  const isMultiTouchingRef = useRef(false);
  const prevDistRef = useRef<number | null>(null);
  const prevAngleRef = useRef<number | null>(null);

  // Velocity damping refs for smooth post-touch momentum
  const zoomVelocityRef = useRef(0);
  const azimuthVelocityRef = useRef(0);

  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;

    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const getTouchAngle = (t1: Touch, t2: Touch) => {
      return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Intercept native mobile pinch-zoom and page scrolling
        e.preventDefault();
        e.stopPropagation();

        isMultiTouchingRef.current = true;
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const angle = getTouchAngle(e.touches[0], e.touches[1]);

        prevDistRef.current = dist;
        prevAngleRef.current = angle;
        zoomVelocityRef.current = 0;
        azimuthVelocityRef.current = 0;

        setCameraGestureState({ isGestureActive: true, gestureType: 'BOTH' });
      } else {
        isMultiTouchingRef.current = false;
        prevDistRef.current = null;
        prevAngleRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isMultiTouchingRef.current) {
        e.preventDefault();
        e.stopPropagation();

        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        const currentAngle = getTouchAngle(e.touches[0], e.touches[1]);

        if (prevDistRef.current !== null && prevAngleRef.current !== null) {
          // 1. PINCH-TO-ZOOM DELTA
          const deltaDist = currentDist - prevDistRef.current;
          if (Math.abs(deltaDist) > 0.4) {
            zoomVelocityRef.current = deltaDist;
            updatePinchZoom(deltaDist);
          }

          // 2. TWO-FINGER ROTATION DELTA
          let deltaAngle = currentAngle - prevAngleRef.current;
          // Handle PI / -PI wraparound
          if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
          if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

          if (Math.abs(deltaAngle) > 0.008) {
            azimuthVelocityRef.current = deltaAngle;
            updateTwoFingerRotation(deltaAngle);
          }
        }

        prevDistRef.current = currentDist;
        prevAngleRef.current = currentAngle;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isMultiTouchingRef.current = false;
        prevDistRef.current = null;
        prevAngleRef.current = null;

        setCameraGestureState({
          isGestureActive: false,
          gestureType: null,
          lastGestureTime: Date.now()
        });
      }
    };

    // Attach listeners with passive: false to allow e.preventDefault()
    domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    domElement.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl, updatePinchZoom, updateTwoFingerRotation, setCameraGestureState]);

  // Inertia damping loop in useFrame
  useFrame((_, delta) => {
    if (!isMultiTouchingRef.current) {
      if (Math.abs(zoomVelocityRef.current) > 0.05) {
        updatePinchZoom(zoomVelocityRef.current * 0.35);
        zoomVelocityRef.current *= Math.max(0, 1 - delta * 12);
      } else {
        zoomVelocityRef.current = 0;
      }

      if (Math.abs(azimuthVelocityRef.current) > 0.001) {
        updateTwoFingerRotation(azimuthVelocityRef.current * 0.35);
        azimuthVelocityRef.current *= Math.max(0, 1 - delta * 12);
      } else {
        azimuthVelocityRef.current = 0;
      }
    }
  });

  return null;
};

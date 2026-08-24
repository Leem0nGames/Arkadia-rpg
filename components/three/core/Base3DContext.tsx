import { createContext, useContext } from 'react';
import { STANDARD_3D_SCALES } from '../constants/standard3DScales';
import { normalize3DObject } from '../assets/normalize3DObject';
import { GPUPerformanceProfile } from '../../../services/GPUPerformanceManager';

export interface Base3DContextValue {
  scales: typeof STANDARD_3D_SCALES;
  normalizeObject: typeof normalize3DObject;
  perfProfile?: GPUPerformanceProfile;
}

export const Base3DContext = createContext<Base3DContextValue>({
  scales: STANDARD_3D_SCALES,
  normalizeObject: normalize3DObject
});

export const useBase3D = () => useContext(Base3DContext);

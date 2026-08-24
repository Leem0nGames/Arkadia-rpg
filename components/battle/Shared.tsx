
import React from 'react';
import * as THREE from 'three';
import { ThreeElements } from '@react-three/fiber';

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children?: React.ReactNode;
  key?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class TextureErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  public props: ErrorBoundaryProps; 

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState { return { hasError: true }; }
  
  componentDidCatch(error: any, errorInfo: any) {
    // console.warn("Texture load failed", error);
  }

  render() { 
      if (this.state.hasError) {
          return this.props.fallback;
      }
      return this.props.children; 
  }
}

export const FallbackUnit = React.memo(({ color }: { color: string }) => (
    <group position={[0, 0.75, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
             <capsuleGeometry args={[0.31, 0.2, 4, 8]} />
             <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 0.25]}>
            <boxGeometry args={[0.25, 0.1, 0.1]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, -0.74, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.4, 16]} />
            <meshBasicMaterial color="black" transparent opacity={0.3} />
        </mesh>
    </group>
));

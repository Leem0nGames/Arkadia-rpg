
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const FogController = React.memo(({ isShadowRealm }: { isShadowRealm: boolean }) => {
    const { scene } = useThree();
    useEffect(() => {
        if (isShadowRealm) {
            scene.fog = new THREE.FogExp2('#1e1b4b', 0.035); 
            scene.background = new THREE.Color('#030712');
        } else {
            // Soft warm dusk atmospheric fog that gives a cozy miniature diorama depth
            scene.fog = new THREE.FogExp2('#111827', 0.016);
            scene.background = new THREE.Color('#0b0f19');
        }
    }, [isShadowRealm, scene]);
    return null;
});

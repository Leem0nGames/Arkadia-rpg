import React, { useEffect, useRef, useState } from 'react';
import { PositionComponent, Dimension } from '../../types';
import { getBiomeNameForCoords } from '../world_map/mapUtils';
import { hexToPixel } from '../../services/hexMath';

interface BiomeShimmerOverlayProps {
  playerPos: PositionComponent;
  dimension: Dimension;
  pan: { x: number; y: number };
  viewport: { x: number; y: number; w: number; h: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const BiomeShimmerOverlay: React.FC<BiomeShimmerOverlayProps> = ({ playerPos, dimension, pan, viewport }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentBiome, setCurrentBiome] = useState<string>(() => getBiomeNameForCoords(playerPos.x, playerPos.y, dimension));
  const [notification, setNotification] = useState<{ name: string; color: string; sub: string } | null>(null);
  
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rippleRef = useRef<{ radius: number; maxRadius: number; alpha: number; color: string; x: number; y: number } | null>(null);

  const getBiomeTheme = (biome: string) => {
    if (biome.includes('Sylvandell')) return { color: '#34d399', secondary: '#059669', sub: 'Bosques Ancestrales y Magia Feérica' };
    if (biome.includes('Kaer-Durn')) return { color: '#f97316', secondary: '#c2410c', sub: 'Picos de Piedra y Forjas Ancestrales' };
    if (biome.includes('Zun')) return { color: '#fbbf24', secondary: '#d97706', sub: 'Dunas Doradas y Ruinas del Sol' };
    if (biome.includes('Frostholm')) return { color: '#38bdf8', secondary: '#0284c7', sub: 'Yermos Glaciales y Ventiscas' };
    if (biome.includes('Morth')) return { color: '#a855f7', secondary: '#7e22ce', sub: 'Ciénagas Profundas y Niebla Tóxica' };
    if (biome.includes('Sombras')) return { color: '#ef4444', secondary: '#991b1b', sub: 'Abismo Dimensional Invertido' };
    if (biome.includes('Niebla')) return { color: '#60a5fa', secondary: '#2563eb', sub: 'Océano Inexplorado' };
    return { color: '#fbbf24', secondary: '#d97706', sub: 'Corazón del Reino y Praderas Seguras' };
  };

  useEffect(() => {
    const newBiome = getBiomeNameForCoords(playerPos.x, playerPos.y, dimension);
    if (newBiome !== currentBiome) {
      setCurrentBiome(newBiome);
      const theme = getBiomeTheme(newBiome);

      // Trigger notification banner
      setNotification({ name: newBiome, color: theme.color, sub: theme.sub });
      setTimeout(() => setNotification(null), 3500);

      // Trigger ripple and particle burst at player screen position
      const playerPix = hexToPixel(playerPos.x, playerPos.y);
      const screenX = playerPix.x - pan.x + viewport.w / 2;
      const screenY = playerPix.y - pan.y + viewport.h / 2;

      rippleRef.current = {
        radius: 10,
        maxRadius: Math.max(viewport.w, viewport.h) * 0.75,
        alpha: 0.85,
        color: theme.color,
        x: screenX,
        y: screenY
      };

      // Spawn magical shimmer particles
      const newParticles: Particle[] = [];
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5;
        newParticles.push({
          x: screenX,
          y: screenY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 5,
          color: Math.random() > 0.4 ? theme.color : '#ffffff',
          alpha: 1.0,
          life: 0,
          maxLife: 40 + Math.random() * 50
        });
      }
      particlesRef.current.push(...newParticles);
    }
  }, [playerPos.x, playerPos.y, dimension]);

  // Animation Loop for Shimmer Ripple & Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const render = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render Ripple Shimmer Wave
      if (rippleRef.current) {
        const r = rippleRef.current;
        r.radius += (r.maxRadius - r.radius) * 0.08;
        r.alpha *= 0.94;

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 4 + (r.alpha * 6);
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 20;
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.stroke();

        // Inner secondary wave
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.max(0, r.alpha * 0.7);
        ctx.stroke();
        ctx.restore();

        if (r.alpha < 0.02) {
          rippleRef.current = null;
        }
      }

      // Render Particles
      if (particlesRef.current.length > 0) {
        ctx.save();
        particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life++;
          p.alpha = 1 - (p.life / p.maxLife);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fill();
        });
        ctx.restore();

        particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Update canvas dimensions
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = viewport.w;
      canvasRef.current.height = viewport.h;
    }
  }, [viewport.w, viewport.h]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Biome Transition Notification Banner */}
      {notification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center animate-bounce duration-1000">
          <div className="px-6 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-md flex flex-col items-center text-center max-w-md">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-0.5">✨ Transición de Bioma ✨</span>
            <span className="text-lg font-bold text-white drop-shadow">{notification.name}</span>
            <span className="text-xs text-slate-300 mt-0.5">{notification.sub}</span>
          </div>
        </div>
      )}
    </div>
  );
};

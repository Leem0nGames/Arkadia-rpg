import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useBattleJuice() {
    const damagePopups = useGameStore(s => s.damagePopups);
    
    const [flashClass, setFlashClass] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<any[]>([]);
    const animatingRef = useRef(false);
    const processedPopupsRef = useRef<Set<string>>(new Set());

    const updateParticles = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            animatingRef.current = false;
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const particles = particlesRef.current;
        if (particles.length === 0) {
            animatingRef.current = false;
            return;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            if (p.color.includes('245, 158, 11')) { // Amber critical diamond spark
                ctx.moveTo(p.x, p.y - p.size);
                ctx.lineTo(p.x + p.size, p.y);
                ctx.lineTo(p.x, p.y + p.size);
                ctx.lineTo(p.x - p.size, p.y);
            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore();
        }

        if (particles.length > 0) {
            requestAnimationFrame(updateParticles);
        } else {
            animatingRef.current = false;
        }
    };

    const spawnScreenParticles = (type: 'red' | 'amber' | 'green') => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        const count = type === 'amber' ? 32 : type === 'green' ? 20 : 15;
        const newParticles = [];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 4 + 2.5) * (type === 'amber' ? 1.5 : 1.0);
            
            let color = 'rgba(239, 68, 68, 0.95)'; // Damage (Red)
            if (type === 'amber') {
                color = Math.random() > 0.45 ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)';
            } else if (type === 'green') {
                color = 'rgba(34, 197, 94, 0.9)'; // Heal (Green)
            }

            newParticles.push({
                x: cx + (Math.random() - 0.5) * (width * 0.5),
                y: cy + (Math.random() - 0.5) * (height * 0.5),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (type === 'green' ? 1.5 : 0),
                size: Math.random() * (type === 'amber' ? 5.5 : 4) + 1.5,
                color,
                life: 1.0,
                decay: Math.random() * 0.022 + 0.012,
                gravity: type === 'green' ? -0.05 : 0.16
            });
        }

        particlesRef.current.push(...newParticles);

        if (!animatingRef.current) {
            animatingRef.current = true;
            requestAnimationFrame(updateParticles);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!damagePopups || damagePopups.length === 0) return;

        const newPopups = damagePopups.filter(p => !processedPopupsRef.current.has(p.id));
        if (newPopups.length === 0) return;

        let maxSeverity: 'red' | 'amber' | 'green' | null = null;

        newPopups.forEach(p => {
            processedPopupsRef.current.add(p.id);

            setTimeout(() => {
                useGameStore.getState().removeDamagePopup(p.id);
                processedPopupsRef.current.delete(p.id);
            }, 1800);

            const isHeal = String(p.amount).includes('+') && !String(p.amount).includes('G');
            const isMiss = String(p.amount).includes('MISS');
            const isGold = String(p.amount).includes('G');

            if (isHeal) {
                if (maxSeverity !== 'amber' && maxSeverity !== 'red') {
                    maxSeverity = 'green';
                }
            } else if (!isMiss && !isGold) {
                if (p.isCrit) {
                    maxSeverity = 'amber';
                } else if (maxSeverity !== 'amber') {
                    maxSeverity = 'red';
                }
            }
        });

        if (maxSeverity) {
            spawnScreenParticles(maxSeverity);

            const flashMap = {
                red: 'animate-vignette-red',
                amber: 'animate-vignette-amber',
                green: 'animate-vignette-green'
            };
            setFlashClass(null);
            setTimeout(() => {
                setFlashClass(flashMap[maxSeverity!]);
            }, 10);

            if (maxSeverity === 'amber' || maxSeverity === 'red') {
                setShake(false);
                setTimeout(() => {
                    setShake(true);
                }, 10);
            }
        }
    }, [damagePopups]);

    return {
        flashClass,
        setFlashClass,
        shake,
        setShake,
        canvasRef
    };
}

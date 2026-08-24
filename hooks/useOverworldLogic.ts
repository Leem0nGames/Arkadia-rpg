import { useState, useRef, useEffect, useMemo } from 'react';
import { HexCell, PositionComponent, WeatherType, Dimension, GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { findPath } from '../services/pathfinding';
import { WorldGenerator } from '../services/WorldGenerator';
import { hexToPixel, pixelToAxial } from '../services/hexMath';

export function useOverworldLogic(
  townMapData: HexCell[],
  playerPos: PositionComponent,
  dimension: Dimension
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [viewport, setViewport] = useState({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });
  const pan = useRef({ x: 0, y: 0 });
  const targetPan = useRef({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const needsRedraw = useRef(true);

  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<HexCell[]>([]);

  const { exploredTiles, gameState, activeOverworldEnemies, gracePeriodEndTime } = useGameStore();
  const isUpsideDown = dimension === Dimension.UPSIDE_DOWN;
  const isTown = gameState === GameState.TOWN_EXPLORATION;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 500);
      return () => clearInterval(interval);
  }, []);

  const isGracePeriod = now < gracePeriodEndTime;

  const visibleCells = useMemo(() => {
      if (isTown && townMapData) return townMapData;

      const cells: HexCell[] = [];
      const { x: cx, y: cy } = pan.current;
      const { w, h } = viewport;
      
      const margin = 2; 
      const tl = pixelToAxial(cx - w/2 - 100, cy - h/2 - 100);
      const br = pixelToAxial(cx + w/2 + 100, cy + h/2 + 100);
      
      const minQ = Math.min(tl.q, br.q) - margin;
      const maxQ = Math.max(tl.q, br.q) + margin;
      const minR = Math.min(tl.r, br.r) - margin;
      const maxR = Math.max(tl.r, br.r) + margin;

      const explored = exploredTiles[dimension];
      if (!explored) return [];

      for (let q = minQ; q <= maxQ; q++) {
          for (let r = minR; r <= maxR; r++) {
              const key = `${q},${r}`;
              if (explored.has(key)) {
                  const cell = WorldGenerator.getTile(q, r, dimension);
                  cell.isExplored = true;
                  const dist = (Math.abs(q - playerPos.x) + Math.abs(q + r - playerPos.x - playerPos.y) + Math.abs(r - playerPos.y)) / 2;
                  cell.isVisible = dist <= (dimension === Dimension.UPSIDE_DOWN ? 1.5 : 2);
                  cells.push(cell);
              }
          }
      }
      return cells;
  }, [pan.current.x, pan.current.y, viewport, isTown, townMapData, playerPos, dimension, exploredTiles]);

  const visibleEnemies = useMemo(() => {
      if (isTown) return [];
      return activeOverworldEnemies.filter(e => e.dimension === dimension);
  }, [activeOverworldEnemies, dimension, isTown]);

  const currentPlayerCell = useMemo(() => {
      if (isTown) return { weather: WeatherType.NONE };
      return WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
  }, [playerPos, dimension, isTown]);

  const currentWeather = currentPlayerCell.weather;

  useEffect(() => {
      if (!hoveredCellKey || isDragging.current) {
          setPreviewPath([]);
          return;
      }
      const [q, r] = hoveredCellKey.split(',').map(Number);
      if (q === playerPos.x && r === playerPos.y) {
          setPreviewPath([]);
          return;
      }

      let path;
      if (isTown && townMapData) {
          path = findPath({q: playerPos.x, r: playerPos.y}, {q, r}, townMapData);
      } else {
          path = findPath({q: playerPos.x, r: playerPos.y}, {q, r}, undefined, (tq, tr) => WorldGenerator.getTile(tq, tr, dimension));
      }
      setPreviewPath(path || []);
  }, [hoveredCellKey, playerPos, dimension, isTown, townMapData]);

  const updateViewport = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setViewport({ x: pan.current.x - clientWidth / 2, y: pan.current.y - clientHeight / 2, w: clientWidth, h: clientHeight });
      }
  };

  useEffect(() => {
    const center = hexToPixel(playerPos.x, playerPos.y);
    pan.current = { x: center.x, y: center.y };
    targetPan.current = { x: center.x, y: center.y };
    updateViewport();
    needsRedraw.current = true;
  }, []);

  useEffect(() => {
    const center = hexToPixel(playerPos.x, playerPos.y);
    targetPan.current = { x: center.x, y: center.y };
    
    const dist = Math.abs(targetPan.current.x - pan.current.x) + Math.abs(targetPan.current.y - pan.current.y);
    if (dist > 1000) {
        pan.current = { ...targetPan.current };
    }
    needsRedraw.current = true;
  }, [playerPos.x, playerPos.y]);

  useEffect(() => {
    const handleResize = () => { updateViewport(); needsRedraw.current = true; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    containerRef,
    canvasRef,
    svgRef,
    viewport,
    pan,
    targetPan,
    isDragging,
    lastMousePos,
    dragDistance,
    needsRedraw,
    hoveredCellKey,
    setHoveredCellKey,
    previewPath,
    setPreviewPath,
    visibleCells,
    visibleEnemies,
    currentWeather,
    isGracePeriod,
    isTown,
    isUpsideDown,
    updateViewport
  };
}

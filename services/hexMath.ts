import { HEX_SIZE } from '../constants';

export const HORIZ_DIST = HEX_SIZE * 1.5;
export const VERT_DIST = Math.sqrt(3) * HEX_SIZE;

export const hexToPixel = (q: number, r: number) => ({
  x: q * HORIZ_DIST,
  y: (r + q / 2) * VERT_DIST
});

export const pixelToAxial = (x: number, y: number) => {
  const q = (2 / 3 * x) / HEX_SIZE;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
  return axialRound(q, r);
};

export const axialRound = (q: number, r: number) => {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(-q - r);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - (-q - r));

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
};

export const NEIGHBOR_OFFSETS = [
  { dq: 1, dr: 0, dir: 'se' },
  { dq: 0, dr: 1, dir: 's' },
  { dq: -1, dr: 1, dir: 'sw' },
  { dq: -1, dr: 0, dir: 'nw' },
  { dq: 0, dr: -1, dir: 'n' },
  { dq: 1, dr: -1, dir: 'ne' }
];

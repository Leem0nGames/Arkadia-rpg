export const rollDice = (sides: number, count: number = 1): number => {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
};

export const rollD20 = (
  type: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): { result: number; raw: number[] } => {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;

  if (type === 'advantage') {
    return { result: Math.max(r1, r2), raw: [r1, r2] };
  } else if (type === 'disadvantage') {
    return { result: Math.min(r1, r2), raw: [r1, r2] };
  }
  return { result: r1, raw: [r1] };
};

/**
 * Rolls 4d6 and drops the lowest die to generate a single attribute score (3-18).
 */
export const roll4d6DropLowest = (): { total: number; dice: number[]; dropped: number } => {
  const dice = [rollDice(6, 1), rollDice(6, 1), rollDice(6, 1), rollDice(6, 1)];
  const sorted = [...dice].sort((a, b) => a - b);
  const dropped = sorted[0];
  const total = sorted[1] + sorted[2] + sorted[3];
  return { total, dice, dropped };
};

/**
 * Generates a full set of 6 scores using 4d6 drop lowest.
 */
export const rollFullSet4d6 = (): {
  scores: number[];
  rolls: { total: number; dice: number[]; dropped: number }[];
} => {
  const rolls = Array.from({ length: 6 }, () => roll4d6DropLowest());
  const scores = rolls.map((r) => r.total);
  return { scores, rolls };
};

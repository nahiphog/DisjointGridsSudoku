export type Grid = number[][];
export type Pair = { left: Grid; right: Grid };
export type Technique = "Full House" | "Naked Single" | "Hidden Single" | "Locked Candidates" | "Naked Pair" | "Hidden Pair" | "Naked Triple" | "Hidden Triple" | "Naked Quadruple" | "Hidden Quadruple" | "X-Wing" | "Swordfish" | "Jellyfish" | "W-Wing" | "XY-Wing" | "XYZ-Wing" | "Unique Rectangle" | "ALS" | "AIC" | "Forcing Chains" | "X-Cycles" | "Medusa" | "Sue de Coq" | "Exocet" | "Templates";

// Technique vocabulary and rating order imported from the sudokUI project
// (GPL-3.0-or-later). This variant adds the inter-grid exclusion constraint.
export const TECHNIQUES: Technique[] = ["Full House", "Naked Single", "Hidden Single", "Locked Candidates", "Naked Pair", "Hidden Pair", "Naked Triple", "Hidden Triple", "Naked Quadruple", "Hidden Quadruple", "X-Wing", "Swordfish", "Jellyfish", "W-Wing", "XY-Wing", "XYZ-Wing", "Unique Rectangle", "ALS", "AIC", "Forcing Chains", "X-Cycles", "Medusa", "Sue de Coq", "Exocet", "Templates"];
export const TECHNIQUE_DIFFICULTY: Record<Technique | "Brute Force", number> = {
  "Full House": 4, "Naked Single": 4, "Hidden Single": 14, "Locked Candidates": 50,
  "Naked Pair": 60, "Hidden Pair": 70, "Naked Triple": 80, "Hidden Triple": 100,
  "Naked Quadruple": 120, "Hidden Quadruple": 150, "X-Wing": 140, "Swordfish": 150,
  "Jellyfish": 160, "W-Wing": 150, "XY-Wing": 160, "XYZ-Wing": 180,
  "Unique Rectangle": 220, "ALS": 350, "AIC": 400, "Forcing Chains": 500,
  "X-Cycles": 600, "Medusa": 700, "Sue de Coq": 800, "Exocet": 1200,
  "Templates": 1500, "Brute Force": 10000,
};
export type CandidateRemoval = { side: 0 | 1; row: number; column: number; digit: number };
export type WalkthroughTechnique = "Full House" | "Naked Single" | "Hidden Single" | "Brute Force";
export type WalkthroughStep = { side: 0 | 1; row: number; column: number; digit: number; technique: WalkthroughTechnique; message: string; removed: CandidateRemoval[] };
export type Walkthrough = { steps: WalkthroughStep[]; ratings: [number, number]; totalRating: number; tallies: [Record<string, number>, Record<string, number>] };
const ALL = 0b111111111;
export const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));
export const clone = (g: Grid) => g.map(row => [...row]);
const bits = (mask: number) => { const out: number[] = []; for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) out.push(d); return out; };
const count = (mask: number) => bits(mask).length;
const box = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

function masks(grid: Grid) {
  const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const d = grid[r][c]; if (d) { const b = 1 << (d - 1); rows[r] |= b; cols[c] |= b; boxes[box(r,c)] |= b; } }
  return { rows, cols, boxes };
}

export function isValid(pair: Pair) {
  for (const grid of [pair.left, pair.right]) for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const d = grid[r][c]; if (!d) continue; grid[r][c] = 0; const m = masks(grid); grid[r][c] = d;
    if ((m.rows[r] | m.cols[c] | m.boxes[box(r,c)]) & (1 << (d - 1))) return false;
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (pair.left[r][c] && pair.left[r][c] === pair.right[r][c]) return false;
  return true;
}

export function candidates(pair: Pair, side: 0 | 1, r: number, c: number) {
  const own = side ? pair.right : pair.left, other = side ? pair.left : pair.right;
  if (own[r][c]) return [];
  const m = masks(own); let used = m.rows[r] | m.cols[c] | m.boxes[box(r,c)];
  if (other[r][c]) used |= 1 << (other[r][c] - 1);
  return bits(ALL & ~used);
}

export function solve(input: Pair, random = false): Pair | null {
  const pair: Pair = { left: clone(input.left), right: clone(input.right) };
  if (!isValid(pair)) return null;
  const search = (): boolean => {
    let best: [0 | 1, number, number, number[]] | null = null;
    for (const side of [0, 1] as const) for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const grid = side ? pair.right : pair.left; if (grid[r][c]) continue;
      const options = candidates(pair, side, r, c); if (!options.length) return false;
      if (!best || options.length < best[3].length) best = [side, r, c, options];
    }
    if (!best) return true;
    const [side, r, c, options] = best; if (random) for (let i = options.length - 1; i; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    const grid = side ? pair.right : pair.left;
    for (const d of options) { grid[r][c] = d; if (search()) return true; grid[r][c] = 0; }
    return false;
  };
  return search() ? pair : null;
}

/** Counts paired-grid completions with MRV backtracking, stopping at `limit`. */
export function countSolutions(input: Pair, limit = 2) {
  const pair: Pair = { left: clone(input.left), right: clone(input.right) };
  if (!isValid(pair)) return 0;
  const state = [masks(pair.left), masks(pair.right)] as const;
  let solutions = 0;
  const search = (): void => {
    if (solutions >= limit) return;
    let best: [0 | 1, number, number, number[]] | null = null;
    for (const side of [0, 1] as const) for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const grid = side ? pair.right : pair.left;
      if (grid[r][c]) continue;
      const own = state[side], other = side ? pair.left : pair.right;
      let used = own.rows[r] | own.cols[c] | own.boxes[box(r, c)];
      if (other[r][c]) used |= 1 << (other[r][c] - 1);
      const options = bits(ALL & ~used);
      if (!options.length) return;
      if (!best || options.length < best[3].length) best = [side, r, c, options];
    }
    if (!best) { solutions++; return; }
    const [side, r, c, options] = best;
    const grid = side ? pair.right : pair.left;
    const own = state[side], b = box(r, c);
    for (const digit of options) {
      const bit = 1 << (digit - 1);
      grid[r][c] = digit; own.rows[r] |= bit; own.cols[c] |= bit; own.boxes[b] |= bit;
      search();
      grid[r][c] = 0; own.rows[r] &= ~bit; own.cols[c] &= ~bit; own.boxes[b] &= ~bit;
      if (solutions >= limit) return;
    }
  };
  search();
  return solutions;
}

export const hasUniqueSolution = (pair: Pair) => countSolutions(pair) === 1;

export function generate(matchedClues = false, splitClues = false) {
  const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5);
  const positions = Array.from({ length: 81 }, (_, index) => [Math.floor(index / 9), index % 9] as const);
  const solved = solve({ left: emptyGrid(), right: emptyGrid() }, true)!;
  const puzzle: Pair = { left: clone(solved.left), right: clone(solved.right) };

  if (splitClues) {
    // Make each matching pair contain at most one clue, while preserving uniqueness.
    for (const [row, column] of shuffle(positions)) {
      const firstSide: 0 | 1 = Math.random() < .5 ? 0 : 1;
      const sides: (0 | 1)[] = [firstSide, firstSide ? 0 : 1];
      let removed = false;
      for (const side of sides) {
        const grid = side ? puzzle.right : puzzle.left;
        const digit = grid[row][column]; grid[row][column] = 0;
        if (hasUniqueSolution(puzzle)) { removed = true; break; }
        grid[row][column] = digit;
      }
      // A fully-clued pair always has a unique completion; this guard is defensive.
      if (!removed) throw new Error("Unable to establish split clues with a unique solution.");
    }
  }

  // One shuffled pass is enough: after a clue fails uniqueness, removing more
  // clues cannot make that same removal uniquely solvable again.
  if (matchedClues) {
    for (const [row, column] of shuffle(positions)) {
      if (!puzzle.left[row][column] && !puzzle.right[row][column]) continue;
      const left = puzzle.left[row][column], right = puzzle.right[row][column];
      puzzle.left[row][column] = 0; puzzle.right[row][column] = 0;
      if (hasUniqueSolution(puzzle)) continue;
      puzzle.left[row][column] = left; puzzle.right[row][column] = right;
    }
  } else {
    const clues = shuffle((([0, 1] as const).flatMap(side => positions.map(([row, column]) => [side, row, column] as const))));
    for (const [side, row, column] of clues) {
      const grid = side ? puzzle.right : puzzle.left;
      if (!grid[row][column]) continue;
      const digit = grid[row][column]; grid[row][column] = 0;
      if (hasUniqueSolution(puzzle)) continue;
      grid[row][column] = digit;
    }
  }
  return { puzzle, solution: solved, solutionCount: countSolutions(puzzle) };
}

/** Removes every individually removable clue from an already unique paired puzzle. */
export function digFurther(input: Pair) {
  const puzzle: Pair = { left: clone(input.left), right: clone(input.right) };
  if (!hasUniqueSolution(puzzle)) return null;
  const positions = ([0, 1] as const).flatMap(side => Array.from({ length: 81 }, (_, index) => [side, Math.floor(index / 9), index % 9] as const));
  for (let index = positions.length - 1; index > 0; index--) { const swap = Math.floor(Math.random() * (index + 1)); [positions[index], positions[swap]] = [positions[swap], positions[index]]; }
  for (const [side, row, column] of positions) {
    const grid = side ? puzzle.right : puzzle.left;
    if (!grid[row][column]) continue;
    const digit = grid[row][column]; grid[row][column] = 0;
    if (!hasUniqueSolution(puzzle)) grid[row][column] = digit;
  }
  return { puzzle, solution: solve(puzzle)!, solutionCount: 1 };
}

/**
 * Makes one candidate for a user-designed clue layout.  The marked cells are
 * retained as givens; every other cell starts empty.  Callers may retry this
 * with fresh completed grids until the paired puzzle has one completion.
 */
export function buildFromPattern(pattern: Pair) {
  const solution = solve({ left: emptyGrid(), right: emptyGrid() }, true)!;
  const puzzle: Pair = { left: emptyGrid(), right: emptyGrid() };
  for (const side of ["left", "right"] as const) {
    for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      if (pattern[side][row][column]) puzzle[side][row][column] = solution[side][row][column];
    }
  }
  return { puzzle, solution, solutionCount: countSolutions(puzzle) };
}

type OpenCell = { side: 0 | 1; row: number; column: number; options: number[] };
type Placement = OpenCell & { digit: number; technique: WalkthroughTechnique };

const unitCells = [
  ...Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, column) => [row, column] as const)),
  ...Array.from({ length: 9 }, (_, column) => Array.from({ length: 9 }, (_, row) => [row, column] as const)),
  ...Array.from({ length: 9 }, (_, boxIndex) => {
    const rowStart = Math.floor(boxIndex / 3) * 3, columnStart = (boxIndex % 3) * 3;
    return Array.from({ length: 9 }, (_, index) => [rowStart + Math.floor(index / 3), columnStart + (index % 3)] as const);
  }),
];

const preferSide = <T extends { side: 0 | 1; row: number; column: number }>(items: T[], preferred: 0 | 1) =>
  [...items].sort((a, b) => (a.side === preferred ? -1 : 1) || a.row - b.row || a.column - b.column)[0];

/** Finds a placement justified by the lightweight human-style techniques we execute. */
function findLogicalPlacement(pair: Pair, open: OpenCell[], preferred: 0 | 1): Placement | null {
  const byCell = new Map(open.map(item => [item.side + "-" + item.row + "-" + item.column, item]));
  const fullHouses: Placement[] = [];
  for (const side of [0, 1] as const) for (const unit of unitCells) {
    const empties = unit.map(([row, column]) => byCell.get(side + "-" + row + "-" + column)).filter((item): item is OpenCell => Boolean(item));
    if (empties.length === 1 && empties[0].options.length === 1) fullHouses.push({ ...empties[0], digit: empties[0].options[0], technique: "Full House" });
  }
  if (fullHouses.length) return preferSide(fullHouses, preferred);

  const naked = open.filter(item => item.options.length === 1).map(item => ({ ...item, digit: item.options[0], technique: "Naked Single" as const }));
  if (naked.length) return preferSide(naked, preferred);

  const hidden: Placement[] = [];
  for (const side of [0, 1] as const) for (const unit of unitCells) for (let digit = 1; digit <= 9; digit++) {
    const matches = unit
      .map(([row, column]) => byCell.get(side + "-" + row + "-" + column))
      .filter((item): item is OpenCell => item !== undefined)
      .filter(item => item.options.includes(digit));
    if (matches.length === 1) hidden.push({ ...matches[0], digit, technique: "Hidden Single" });
  }
  return hidden.length ? preferSide(hidden, preferred) : null;
}

/** Builds a transparent replay from the clues to a verified paired solution. */
export function buildWalkthrough(puzzle: Pair, solution: Pair): Walkthrough {
  const replay: Pair = { left: clone(puzzle.left), right: clone(puzzle.right) };
  const steps: WalkthroughStep[] = [];
  const tallies: [Record<string, number>, Record<string, number>] = [{}, {}];
  const ratings: [number, number] = [0, 0];
  let preferred: 0 | 1 = 0;
  while (true) {
    const open: Array<{ side: 0 | 1; row: number; column: number; options: number[] }> = [];
    for (const side of [0, 1] as const) for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      if ((side ? replay.right : replay.left)[row][column]) continue;
      open.push({ side, row, column, options: candidates(replay, side, row, column) });
    }
    if (!open.length) break;
    const logical = findLogicalPlacement(replay, open, preferred);
    const fallback = [...open].sort((a, b) => (a.side === preferred ? -1 : 1) || a.options.length - b.options.length || a.row - b.row || a.column - b.column)[0];
    const picked = logical ?? fallback;
    const digit = logical?.digit ?? (picked.side ? solution.right : solution.left)[picked.row][picked.column];
    const technique: WalkthroughTechnique = logical?.technique ?? "Brute Force";
    const before = new Map(open.map(item => [item.side + "-" + item.row + "-" + item.column, item.options]));
    (picked.side ? replay.right : replay.left)[picked.row][picked.column] = digit;
    const removed: CandidateRemoval[] = [];
    for (const side of [0, 1] as const) for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      if ((side ? replay.right : replay.left)[row][column]) continue;
      const key = side + "-" + row + "-" + column;
      const prior = before.get(key) ?? [];
      const current = candidates(replay, side, row, column);
      prior.filter(value => !current.includes(value)).forEach(value => removed.push({ side, row, column, digit: value }));
    }
    const label = picked.side ? "Grid B" : "Grid A";
    steps.push({ ...picked, digit, technique, removed, message: `${label}: r${picked.row + 1}c${picked.column + 1} = ${digit} (${technique}).` });
    tallies[picked.side][technique] = (tallies[picked.side][technique] ?? 0) + 1;
    ratings[picked.side] += TECHNIQUE_DIFFICULTY[technique];
    preferred = picked.side === 0 ? 1 : 0;
  }
  return { steps, ratings, totalRating: ratings[0] + ratings[1], tallies };
}

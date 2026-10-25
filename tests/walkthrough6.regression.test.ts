import { describe, expect, it } from "vitest";
import { buildWalkthrough6, generate6, solve6 } from "../src/engine6";

describe("6×6 walkthrough", () => {
  it("uses the full 9×9 active-technique pipeline without reversing a placement", () => {
    const generated = generate6("single");
    const walkthrough = buildWalkthrough6(generated.puzzle, generated.solution);
    const replay = {
      left: generated.puzzle.left.map(row => [...row]),
      right: generated.puzzle.right.map(row => [...row]),
    };

    for (const step of walkthrough.steps) {
      const grid = step.side ? replay.right : replay.left;
      if (step.kind === "placement") {
        expect(grid[step.row][step.column]).toBe(0);
        grid[step.row][step.column] = step.digit;
      }
      for (const row of grid) for (const value of row) expect(value).toBeGreaterThanOrEqual(0);
    }

    expect(replay).toEqual(generated.solution);
  });

  it("never pads an absent candidate into a hidden subset", () => {
    const text = "..........23..64..24..5.5.2............4........4.......13.4.6...15.....";
    const read = (offset: number) => Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) => text[offset + row * 6 + column] === "." ? 0 : Number(text[offset + row * 6 + column])));
    const puzzle = { left: read(0), right: read(36) };
    const solution = solve6(puzzle)!;
    const walkthrough = buildWalkthrough6(puzzle, solution);

    expect(walkthrough.steps.some(step => step.kind === "elimination" && step.technique === "Hidden Pair" && step.removed.some(removal => removal.side === 0 && removal.row === 0 && removal.column === 4 && removal.digit === 6))).toBe(false);
    expect(walkthrough.steps.flatMap(step => step.removed).some(removal => (removal.side ? solution.right : solution.left)[removal.row][removal.column] === removal.digit)).toBe(false);
  });
});

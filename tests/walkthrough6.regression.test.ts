import { describe, expect, it } from "vitest";
import { buildWalkthrough6, generate6 } from "../src/engine6";

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
});
